/*
This utility runs mocha tests based on test filter passed in cli.

Examples:
node mocha-run.js // npx mocha tests
node mocha-run.js -g "Smoke" // npx mocha tests -g "Smoke"
node mocha-run.js tests/mail -g "Smoke" // npx mocha tests/mail -g "Smoke"
node mocha-run.js tests/mail/message tests/mail/folder -g "Smoke" // npx mocha tests/mail -g "Smoke"
node mocha-run.js tests -g "Serial" --serial true
*/

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runSetupOnce } from './framework/core/setup.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
const argv = yargs(hideBin(process.argv)).argv;

// Jobs or workers
const parsedWorkers = Number(argv.jobs ?? argv.j ?? argv.workers);
const workers = Number.isInteger(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : null;

// CLI environment variables
process.env.ENV = argv.env?.toUpperCase();
process.env.ZIMLET = argv.zimlet;
process.env.CHAT = argv.chat;
process.env.SERIAL = argv.serial ?? process.env.SERIAL;
const isSerial = String(process.env.SERIAL).toUpperCase() === 'TRUE';

// Reports
const TEST_REPORTS_DIR_NAME = 'test-reports';
const TEST_REPORT_XML_FILE_NAME = 'test-report.xml';

// Paths
const cwd = process.cwd();
const xmlReportPath = path.join(cwd, TEST_REPORTS_DIR_NAME, TEST_REPORT_XML_FILE_NAME);

// Remove old report
if (fs.existsSync(xmlReportPath)) {
	fs.unlinkSync(xmlReportPath);
}

// Setup
await runSetupOnce();

// Build mocha args
const mochaArgs = [];
const grepIndex = process.argv.indexOf('-g');
if (grepIndex !== -1) {
	mochaArgs.push('-g', process.argv[grepIndex + 1]);
}

// Test paths
const testPaths = process.argv.filter(arg => arg.startsWith('tests/'));
if (testPaths.length > 0) {
	mochaArgs.push(...testPaths);
} else {
	mochaArgs.push('tests');
}

// Validate matched tests
if (grepIndex !== -1) {
	const listArgs = [
		'node_modules/mocha/bin/mocha.js',
		'--config',
		'.mocharc.json',
		'--list-tests'
	];

	// Force serial mode override
	if (isSerial) {
		listArgs.push('--no-parallel');
		listArgs.push('--jobs', '1');
	} else if (workers !== null) {
		listArgs.push('--jobs', String(workers));
	}

	listArgs.push(...mochaArgs);
	const listResult = spawnSync(
		process.execPath,
		listArgs,
		{
			cwd,
			encoding: 'utf8',
			stdio: 'pipe'
		}
	);

	const matchedTests = (listResult.stdout || '').split('\n').filter(Boolean).length;
	if (matchedTests === 0) {
		throw new Error('No tests matched');
	}
}

// Build mocha run args
const mochaRunArgs = [
	'node_modules/mocha/bin/mocha.js',
	'--config',
	'.mocharc.json',
	'--reporter',
	'mocha-multi-reporters',
	'--reporter-options',
	'configFile=multi-reporters.json'
];

// Force serial mode override
if (isSerial) {
	mochaRunArgs.push('--no-parallel');
	mochaRunArgs.push('--jobs', '1');
} else if (workers !== null) {
	mochaRunArgs.push('--jobs', String(workers));
}
mochaRunArgs.push(...mochaArgs);

// Run mocha
const result = spawnSync(
	process.execPath,
	mochaRunArgs,
	{
		stdio: 'inherit',
		cwd,
		env: {
			...process.env,
			NODE_TLS_REJECT_UNAUTHORIZED: '0',
			NODE_OPTIONS: '--no-warnings'
		}
	}
);

// Generate html report
if (fs.existsSync(xmlReportPath)) {
	spawnSync(
		process.execPath,
		['framework/report/xml-to-html-report.js', xmlReportPath],
		{
			stdio: 'inherit',
			cwd
		}
	);
}

// Summary
let exitCode = 1;
if (fs.existsSync(xmlReportPath)) {
	const xml = fs.readFileSync(xmlReportPath, 'utf8');
	const failureMatches = [...xml.matchAll(/failures="(\d+)"/g)];
	const errorMatches = [...xml.matchAll(/errors="(\d+)"/g)];
	const testMatches = [...xml.matchAll(/tests="(\d+)"/g)];
	const timeMatch = xml.match(/time="([\d.]+)"/);

	const failures = failureMatches.reduce((sum, m) => sum + Number(m[1]), 0);
	const errors = errorMatches.reduce((sum, m) => sum + Number(m[1]), 0);
	const tests = testMatches.reduce((sum, m) => sum + Number(m[1]), 0);

	const failedCount = failures + errors;
	const totalTimeSeconds = timeMatch ? Number(timeMatch[1]) : 0;
	const totalTimeMinutes = (totalTimeSeconds / 60).toFixed(2);

	if (tests === 0) {
		exitCode = 1;
	} else if (failedCount > 0) {
		exitCode = failedCount;
	} else {
		exitCode = 0;
	}

	console.log('\n=============================================');
	console.log(`Total = ${tests}, Passed = ${tests - failedCount}, Failed = ${failedCount}`);
	console.log(`Time = ${totalTimeSeconds.toFixed(2)} sec (${totalTimeMinutes} min)`);
	console.log(`Exit code = ${exitCode}`);
	console.log('=============================================');
}

process.exit(exitCode);