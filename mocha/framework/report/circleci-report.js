/* CircleCI report utility to download job xml artifacts, merge all job xml into a single junit xml and generate final html report using xml-to-html-report.js */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs';
import path from 'node:path';
import { parseStringPromise, Builder } from 'xml2js';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = yargs(hideBin(process.argv)).argv;
const GIT_REPO_NAME = process.env.CIRCLE_PROJECT_REPONAME || 'zm-api-automation';
const GIT_REPO_DIR = path.join(__dirname.split(GIT_REPO_NAME)[0], GIT_REPO_NAME);
const TEST_REPORTS_DIR = args.TEST_REPORTS_DIR ? path.resolve(args.TEST_REPORTS_DIR) : path.join(GIT_REPO_DIR, 'test-reports');
const RAW_REPORTS_DIR = path.join(TEST_REPORTS_DIR, 'raw');

// Args
const SERVER_ENVIRONMENT = (args.SERVER_ENVIRONMENT || 'ZIMBRA101').toUpperCase();
const AUTOMATION_TYPE = (args.AUTOMATION_TYPE || 'SOAP').toUpperCase();

// CircleCI
const CIRCLE_WORKFLOW_ID = process.env.CIRCLE_WORKFLOW_ID || '296b7407-ffeb-4dfe-ab45-67841c0445e8';
const CIRCLE_PROJECT_USERNAME = process.env.CIRCLE_PROJECT_USERNAME || 'Zimbra';
const CIRCLE_PROJECT_REPONAME = GIT_REPO_NAME;
const CIRCLE_BRANCH = process.env.CIRCLE_BRANCH || 'ZCS-18376';
const CIRCLE_TOKEN = process.env.CIRCLE_TOKEN;

// Workflow jobs
const JOBS = {
	SMOKE: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-smoke-mocha',
			ZIMBRA101: 'smoke-zimbra101',
			ZIMBRA101_MULTINODE: 'smoke-zimbra101-multinode',
			ZIMBRAX: 'smoke-zimbrax',
		},
	},
	SANITY: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-sanity-mocha',
			ZIMBRA101: 'sanity-zimbra101',
			ZIMBRA101_MULTINODE: 'sanity-zimbra101-multinode',
			ZIMBRAX: 'sanity-zimbrax',
		},
	},
	FUNCTIONAL: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-functional-mocha',
			ZIMBRA101: 'functional-zimbra101',
			ZIMBRA101_MULTINODE: 'functional-zimbra101-multinode',
			ZIMBRAX: 'functional-zimbrax',
		},
	},
	REGRESSION: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-regression-mocha',
			ZIMBRA101: 'regression-zimbra101',
			ZIMBRA101_MULTINODE: 'regression-zimbra101-multinode',
			ZIMBRAX: 'regression-zimbrax',
		},
	},
	ZIMLET: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-zimlet-mocha',
			ZIMBRA101: 'zimlet-zimbra101',
			ZIMBRA101_MULTINODE: 'zimlet-zimbra101-multinode',
			ZIMBRAX: 'zimlet-zimbrax',
		},
	},
	CHAT: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-chat-mocha',
			ZIMBRA101: 'chat-zimbra101',
			ZIMBRA101_CHAT_MULTINODE: 'chat-zimbra101-multinode',
		},
	},
	SERIAL: {
		SOAP: {
			ZIMBRA101_RELEASE: 'soap-serial-mocha',
			ZIMBRA101: 'serial-zimbra101',
			ZIMBRA101_MULTINODE: 'serial-zimbra101-multinode',
		},
	},
};

// Main
const downloadedArtifactUrls = new Set();
const downloadedXmlFiles = [];
(async function run() {
	if (!fs.existsSync(TEST_REPORTS_DIR)) {
		fs.mkdirSync(TEST_REPORTS_DIR, { recursive: true });
	}
	if (!fs.existsSync(RAW_REPORTS_DIR)) {
		fs.mkdirSync(RAW_REPORTS_DIR, { recursive: true });
	}

	for (const group of Object.values(JOBS)) {
		const jobName = group?.[AUTOMATION_TYPE]?.[SERVER_ENVIRONMENT];
		if (jobName) {
			await fetchJob(jobName);
		}
	}

	if (!downloadedXmlFiles.length) {
		throw new Error('No xml artifacts found');
	}

	const reportBaseName = `${AUTOMATION_TYPE}-Automation-Report-${CIRCLE_BRANCH}`.replace(/[^\w.-]+/g, '_');
	const mergedXmlPath = path.join(TEST_REPORTS_DIR, `${reportBaseName}.xml`);
	await mergeJUnitXml(downloadedXmlFiles, mergedXmlPath);

	const htmlScript = path.join(__dirname, 'xml-to-html-report.js');
	const result = spawnSync(process.execPath, [ htmlScript, mergedXmlPath ], { stdio: 'inherit' });
	if (result.status !== 0) {
		throw new Error('Html report generation failed');
	}

	// Remove left over test-report.xml
	const legacyReport = path.join(TEST_REPORTS_DIR, 'test-report.xml');
	if (fs.existsSync(legacyReport)) {
		fs.unlinkSync(legacyReport);
		console.log(`${getStatusIcon('PASSED')} Removed legacy test-report.xml`);
	}

	// Remove raw container xmls so CircleCI does not count them
	if (fs.existsSync(RAW_REPORTS_DIR)) {
		const files = fs.readdirSync(RAW_REPORTS_DIR);
		for (const file of files) {
			if (file.endsWith('.xml')) {
				fs.unlinkSync(path.join(RAW_REPORTS_DIR, file));
			}
		}
		console.log(`${getStatusIcon('PASSED')} Removed raw container xml reports`);
	}

})().catch(err => {
	throw new Error(err);
});


// Common functions
async function fetchJob(jobName) {
	console.log(`\n${getStatusIcon('STARTING')} Check ${jobName} job run`);
	const buildNumber = await getBuildNumber(jobName);
	if (buildNumber) {
		console.log(`${getStatusIcon('PASSED')} ${jobName} report available`);
	} else {
		console.log(`${getStatusIcon('SKIPPED')} ${jobName} job not found`);
		return;
	}
	const artifacts = await getArtifacts(buildNumber);
	await downloadXmlArtifacts(artifacts.xmlFiles);
	console.log(`${getStatusIcon('PASSED')} Downloaded ${jobName} xml report`);
}

async function getBuildNumber(jobName) {
	const url = `https://circleci.com/api/v2/workflow/${CIRCLE_WORKFLOW_ID}/job?circle-token=${CIRCLE_TOKEN}`;
	const response = await fetch(url).then(r => r.json());
	const job = response.items.find(i => i.name === jobName);
	return job?.job_number || 0;
}

async function getArtifacts(buildNumber) {
	const url = `https://circleci.com/api/v1.1/project/github/${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/${buildNumber}/artifacts?circle-token=${CIRCLE_TOKEN}`;
	const response = await fetch(url).then(r => r.json());

	const artifacts = Array.isArray(response)
		? response
		: Array.isArray(response?.items)
			? response.items
			: [];

	return {
		xmlFiles: artifacts
			.filter(a => a.url && a.url.endsWith('.xml'))
			.map(a => a.url),
	};
}

async function downloadXmlArtifacts(urls) {
	for (const url of urls) {
		if (downloadedArtifactUrls.has(url)) {
			continue;
		}
		downloadedArtifactUrls.add(url);
		const uniqueName = Buffer.from(url).toString('base64') + '.xml';
		const filePath = path.join(RAW_REPORTS_DIR, uniqueName);
		const content = await fetch(`${url}?circle-token=${CIRCLE_TOKEN}`).then(r => r.text());
		fs.writeFileSync(filePath, content);
		downloadedXmlFiles.push(filePath);
	}
}

async function mergeJUnitXml(xmlFiles, outputFile) {
	console.log('\n+++ Merging xml reports (no collapsing) +++');

	const root = {
		testsuites: {
			$: { tests: 0, failures: 0, errors: 0, skipped: 0, time: 0 },
			testsuite: [
				{
					$: {
						name: 'Mocha Tests',
						tests: 0,
						failures: 0,
						errors: 0,
						skipped: 0,
						time: 0,
					},
					testcase: [],
				},
			],
		},
	};

	const seenTestcases = new Set();
	const suite = root.testsuites.testsuite[0];

	for (const file of xmlFiles) {
		const xml = fs.readFileSync(file, 'utf-8');
		const parsed = await parseStringPromise(xml, { mergeAttrs: true });
		const suites =
			parsed.testsuites?.testsuite ||
			(parsed.testsuite ? [parsed.testsuite] : []);

		for (const ts of suites) {
			const testcases = ts.testcase;
			if (!Array.isArray(testcases) || !testcases.length) {
				continue;
			}

			for (const tc of testcases) {
				const name = tc.name?.[0] || tc.name || '';
				const classname = tc.classname?.[0] || tc.classname || 'Mocha';
				const time = Number(tc.time || 0);
				const dedupKey = `${classname}::${name}`;
				if (seenTestcases.has(dedupKey)) {
					continue;
				}
				seenTestcases.add(dedupKey);

				const normalized = {
					$: {
						name,
						classname,
						time: String(time),
					},
				};

				if (tc.failure) normalized.failure = tc.failure;
				if (tc.error) normalized.error = tc.error;
				if (tc.skipped) normalized.skipped = tc.skipped;
				if (tc['system-out']) normalized['system-out'] = tc['system-out'];
				if (tc['system-err']) normalized['system-err'] = tc['system-err'];

				// Counters
				suite.testcase.push(normalized);
				suite.$.tests += 1;
				root.testsuites.$.tests += 1;
				suite.$.time += time;
				root.testsuites.$.time += time;

				if (tc.failure) {
					suite.$.failures += 1;
					root.testsuites.$.failures += 1;
				}
				if (tc.error) {
					suite.$.errors += 1;
					root.testsuites.$.errors += 1;
				}
				if (tc.skipped) {
					suite.$.skipped += 1;
					root.testsuites.$.skipped += 1;
				}
			}
		}
	}

	const builder = new Builder({ headless: false, renderOpts: { pretty: false } });
	fs.writeFileSync(outputFile, builder.buildObject(root));
}

function getStatusIcon(status) {
	if (status === 'STARTING') {
		return '\x1b[1;33m->\x1b[0m';
	}
	if (status === 'PASSED') {
		return '\x1b[32m√\x1b[0m';
	}
	if (status === 'FAILED') {
		return '\x1b[31m✖\x1b[0m';
	}
	if (status === 'SKIPPED') {
		return '\x1b[33m⚠\x1b[0m';
	}
	return '\x1b[34m?\x1b[0m';
}