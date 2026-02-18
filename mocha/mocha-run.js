/*
This utility runs mocha tests based on test filter passed in cli.
node mocha-run.js // npx mocha tests
node mocha-run.js -g "Smoke" // npx mocha tests -g "Smoke"
node mocha-run.js tests/mail -g "Smoke" // npx mocha tests/mail -g "Smoke"
node mocha-run.js tests/protocol/rest tests/mail -g "Smoke"
*/

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runSetupOnce } from './framework/core/setup.js';

// Reports
const TEST_REPORTS_DIR_NAME = 'test-reports';
const TEST_REPORT_XML_FILE_NAME = 'test-report.xml';

// Paths
const cwd = process.cwd();
const xmlReportPath = path.join(cwd, TEST_REPORTS_DIR_NAME, TEST_REPORT_XML_FILE_NAME);
if (fs.existsSync(xmlReportPath)) {
	fs.unlinkSync(xmlReportPath);
}

// Setup
await runSetupOnce();

// Grep
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

// Tests grep
if (grepIndex !== -1) {
	const listResult = spawnSync(
		process.execPath,
		[
			'node_modules/mocha/bin/mocha.js',
			'--config',
			'.mocharc.json',
			'--list-tests',
			...mochaArgs
		],
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

// Mocha run
const result = spawnSync(
	process.execPath,
	[
		'node_modules/mocha/bin/mocha.js',
		'--config',
		'.mocharc.json',
		'--reporter',
		'mocha-multi-reporters',
		'--reporter-options',
		'configFile=multi-reporters.json',
		...mochaArgs
	],
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

// Test report
if (fs.existsSync(xmlReportPath)) {
	spawnSync(
		process.execPath,
		[ 'framework/report/xml-to-html-report.js', xmlReportPath ],
		{ stdio: 'inherit', cwd }
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