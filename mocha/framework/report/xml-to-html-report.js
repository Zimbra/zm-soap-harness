/*
This utility converts xml to html report and uses test-reports folder as default reports directory.
node framework/report/xml-to-html-report.js
node framework/report/xml-to-html-report.js SOAP-Automation-Report-ZCS-18376.xml
node framework/report/xml-to-html-report.js 11.0.0/test-report.xml
node framework/report/xml-to-html-report.js ANDROID-GALAXY-S24-RZCX709CCVE-GMAIL-25-01-2026-111906am.xml
node framework/report/xml-to-html-report.js 11.0.0/ANDROID-GALAXY-S24-RZCX709CCVE-GMAIL-25-01-2026-111906am.xml
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { parseString } from 'xml2js';
import { soap } from '../../framework/backend/soap-client.js';

// Args
const TEST_REPORTS_DIR = path.join(process.cwd(), 'test-reports');
const resolveLatestXml = dir => {
	if (!fs.existsSync(dir)) return null;
	const files = fs.readdirSync(dir)
		.filter(f => f.endsWith('.xml'))
		.map(f => {
			const fullPath = path.join(dir, f);
			const stat = fs.statSync(fullPath);
			return { path: fullPath, mtime: stat.mtimeMs, size: stat.size };
		})
		.filter(f => f.size > 0)
		.sort((a, b) => b.mtime - a.mtime);
	return files[0]?.path || null;
};

// Report type
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../');
const repoName = path.basename(repoRoot);
const HIDE_SCREENSHOT_COLUMN = repoName === 'zm-api-automation';
const resolveScreenshot = (status, suiteName, testName) => {
	const safe = s => String(s || '').replace(/[^\w.-]+/g, '-');
	const fileName = `${status}-${safe(suiteName)}-${safe(testName)}.png`;
	return fileName;
};

// Args
let TEST_REPORT_XML;
if (process.argv[2] && !process.argv[2].startsWith('--')) {
	TEST_REPORT_XML = path.isAbsolute(process.argv[2])
		? process.argv[2]
		: path.join(TEST_REPORTS_DIR, process.argv[2]);
} else {
	TEST_REPORT_XML = resolveLatestXml(TEST_REPORTS_DIR);
}
const TEST_REPORT_HTML = path.join(
	path.dirname(TEST_REPORT_XML),
	`${path.basename(TEST_REPORT_XML, path.extname(TEST_REPORT_XML))}.html`
);

const automationArg = process.argv.find(arg => arg.startsWith('--AUTOMATION_TYPE='));
let AUTOMATION_TYPE = automationArg ? automationArg.split('=')[1] : undefined;
if (!AUTOMATION_TYPE) {
	AUTOMATION_TYPE = repoName === 'zm-mobile-automation' ? 'Active Sync Mobile' : 'SOAP API';
}

const serverArg = process.argv.find(arg => arg.startsWith('--SERVER_ENVRIONMENT='));
const SERVER_ENVRIONMENT = serverArg ? serverArg.split('=')[1] : '';
const config = JSON.parse(fs.readFileSync(new URL('../../conf/environment.json', import.meta.url), 'utf-8'));
let SERVER_HOST = '';
if (SERVER_ENVRIONMENT) {
	const SERVER_CONFIG = config[SERVER_ENVRIONMENT];
	if (!SERVER_CONFIG) {
		throw new Error(`Invalid SERVER_ENVRIONMENT: ${SERVER_ENVRIONMENT}`);
	}
	SERVER_HOST = SERVER_CONFIG.serverHost;
}

// Final validation
if (!TEST_REPORT_XML || !fs.existsSync(TEST_REPORT_XML)) {
	throw new Error(`No xml report found.
Usage: node framework/report/xml-to-html-report.js <xml-file>
node framework/report/xml-to-html-report.js 11.0.0/test-report.xml
`);
}

// Get zimbra version
process.removeAllListeners('warning');
process.on('warning', warning => {
	if (warning.name !== 'Warning' || !String(warning.message).includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
		console.warn(warning);
	}
});
const adminAuthToken = await soap.getAdminAuthToken(config.adminEmailAddress, config.adminPassword);
const ZIMBRA_VERSION = String(await soap.getVersionInfo(adminAuthToken));

// Parsing
const xml = fs.readFileSync(TEST_REPORT_XML, 'utf-8');
parseString(xml, { mergeAttrs: true }, (err, result) => {
	if (err) {
		throw new Error('Invalid xml');
	}
	const seenTestcases = new Map();

	function normalizePipes(name = '') {
		return String(name)
			.replace(/\s*\|\|\s*/g, ' | ')
			.replace(/\s*\|\s*/g, ' | ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function normalizeClassname(classname = '') {
		return String(classname)
			.split('.')
			.pop()
			.replace(/_/g, ' ')
			.replace(/>/g, ' > ')
			.trim();
	}

	function normalizeTestcaseName(name = '') {
		const cleanedName = normalizePipes(name);
		const parts = cleanedName.split(/\s+(?=[A-Z]{2,}\d+$)/);

		if (cleanedName.includes('|')) {
			return cleanedName;
		}

		if (parts.length === 2) {
			const id = parts[1];
			const rest = parts[0];
			const typeMatch = rest.match(/^(Smoke|Sanity|Functional|Regression)\s+/i);
			if (typeMatch) {
				const type = typeMatch[1];
				const action = rest.slice(type.length).trim();
				return normalizePipes(`${type} | ${action} | ${id}`);
			}
		}
		return cleanedName;
	}

	function walk(node, suiteNameFromProps) {
		if (!node) return;

		if (node.properties && node.properties[0]?.property) {
			const suiteProp = node.properties[0].property.find(p => p.name === 'suiteName');
			if (suiteProp?.value) {
				suiteNameFromProps = suiteProp.value;
			}
		}

		if (node.testcase) {
			node.testcase.forEach(tc => {
				const suite = suiteNameFromProps || normalizeClassname(tc.classname);
				const rawTestName = tc.name || '';
				const testName = normalizeTestcaseName(rawTestName) || '—';
				const failure = tc.failure || tc.error;
				const systemOut = tc['system-out'] ? tc['system-out'][0] : '';
				const status = failure ? 'FAILED' : 'PASSED';
				const time = Number(tc.time) || 0;

				const screenshotFile = resolveScreenshot(status, suite, rawTestName);
				const screenshotPath = path.join(path.dirname(TEST_REPORT_XML), screenshotFile);
				const screenshot = fs.existsSync(screenshotPath) ? screenshotFile : null;
				const key = `${suite}::${testName}`;

				if (!seenTestcases.has(key)) {
					seenTestcases.set(key, {
						suite,
						name: testName,
						time,
						status,
						screenshot,
						details: failure ? escapeHtml(failure[0]._ || failure[0]) : '',
						logs: escapeHtml(systemOut)
					});

				} else {
					const existing = seenTestcases.get(key);
					if (status === 'FAILED') {
						existing.status = 'FAILED';
						existing.details = existing.details || (failure ? escapeHtml(failure[0]._ || failure[0]) : '');
						existing.logs = existing.logs || escapeHtml(systemOut);
					}

					existing.time = Math.max(existing.time, time);
				}
			});
		}

		if (node.testsuite) {
			node.testsuite.forEach(ts => walk(ts, suiteNameFromProps));
		}
	}

	// Walk
	walk(result.testsuites || result.testsuite);

	// Materialize deduped testcases
	const testcases = Array.from(seenTestcases.values());
	const total = testcases.length;
	const failed = testcases.filter(t => t.status === 'FAILED').length;
	const passed = total - failed;
	const totalTimeSeconds = testcases.reduce((s, t) => s + t.time, 0);

	let headerTimeSeconds = 0;
	if (result.testsuites?.time) {
		headerTimeSeconds = Number(result.testsuites.time) || 0;
	} else if (result.testsuite?.time) {
		headerTimeSeconds = Number(result.testsuite.time) || 0;
	}

	const effectiveTimeSeconds = headerTimeSeconds || totalTimeSeconds;
	const elapsedMinutes = (effectiveTimeSeconds / 60).toFixed(2);

	const failedPercent = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';
	const passedPercent = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

	const failedTests = testcases.filter(t => t.status === 'FAILED');
	const passedTests = testcases.filter(t => t.status === 'PASSED');

	try {
		fs.writeFileSync(
			TEST_REPORT_HTML,
			buildHtml({
				AUTOMATION_TYPE,
				SERVER_HOST,
				ZIMBRA_VERSION,
				total,
				passed,
				failed,
				passedPercent,
				failedPercent,
				failedTests,
				passedTests,
				elapsedMinutes
			}),
			'utf-8'
		);
		console.log(`${getStatusIcon('PASSED')} xml report:  ${TEST_REPORT_XML}`);
		console.log(`${getStatusIcon('PASSED')} html report: ${TEST_REPORT_HTML}`);

	} catch {
		throw new Error('Could not generate html report from xml file');
	}

	function getStatusIcon(status) {
		if (status === 'PASSED') return '\x1b[32m√\x1b[0m';
		if (status === 'FAILED') return '\x1b[31m✖\x1b[0m';
		return '\x1b[34m?\x1b[0m';
	}
});

function escapeHtml(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTable(tableId, rows) {
	return `<table id="${tableId}">
		<colgroup>
			<col style="width:4%">
			<col style="width:20%">
			<col style="width:55%">
			<col style="width:7%">
			<col style="width:7%">
			${HIDE_SCREENSHOT_COLUMN ? '' : '<col style="width:7%">'}
		</colgroup>
		<thead>
		<tr>
			<th onclick="sortTable('${tableId}', 0)">#</th>
			<th onclick="sortTable('${tableId}', 1)">Suite</th>
			<th onclick="sortTable('${tableId}', 2)">Testcase</th>
			<th onclick="sortTable('${tableId}', 3)">Time</th>
			<th>Status</th>
			${HIDE_SCREENSHOT_COLUMN ? '' : '<th>Screenshot</th>'}
		</tr>
		</thead>
		<tbody>
		${rows.map((tc, i) => `
		<tr class="data-row" data-status="${tc.status}" data-target="${tableId}-fail-${i}">
			<td class="serial" data-index="${i + 1}">${i + 1}</td>
			<td>${tc.suite}</td>
			<td>${tc.name}</td>
			<td>${tc.time}</td>
			<td class="${tc.status === 'FAILED' ? 'fail' : 'pass'}">${tc.status}</td>
			${HIDE_SCREENSHOT_COLUMN ? '' : `<td>${tc.screenshot ? `<a href="${tc.screenshot}" target="_blank" onclick="event.stopPropagation()">View</a>` : '-'}</td>`}
		</tr>
		${(tc.status === 'FAILED' || tc.logs) ? `
		<tr id="${tableId}-fail-${i}" class="failure-row hidden">
			<td colspan="${HIDE_SCREENSHOT_COLUMN ? 5 : 6}">
				${tc.status === 'FAILED' ? `<b>Failure:</b><pre>${tc.details}</pre>` : ''}
				${tc.logs ? `<b>Logs:</b><pre>${tc.logs}</pre>` : ''}
			</td>
		</tr>` : ''}
		`).join('')}
		</tbody>
	</table>`;
}

function buildHtml({ AUTOMATION_TYPE, SERVER_HOST, ZIMBRA_VERSION, total, passed, failed, passedPercent, failedPercent, failedTests, passedTests, elapsedMinutes }) {
	return `<!DOCTYPE html>
		<html>
			<head>
			<meta charset="UTF-8">
			<title>${AUTOMATION_TYPE} Automation Report (${ZIMBRA_VERSION})</title>
			<link id="status-favicon" rel="icon">

			<style>
				body {
					margin:0;
					font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
					color:#1f2328;
					font-size:14px;
				}
				.hidden {
					display:none;
				}

				/* Header */
				header {
					position:sticky;
					top:0;
					z-index:10;
					background:#016259c4;
					padding:16px;
					color:#ffffff;
				}
				h1 {
					margin:0 0 12px;
					font-size:28px;
					color:#ffffff;
				}
				.top-bar {
					display:flex;
					align-items:center;
					gap:12px;
				}
				.top-left, .top-right {
					display:flex;
					gap:12px;
				}
				.top-center {
					flex:1;
					display:flex;
					justify-content:center;
				}
				.report-version {
					font-style: italic;
					font-size: 18px;
					color: #fffbc5;
					font-weight: 400;
					margin-left: 6px;
				}

				/* Boxes */
				.box {
					background:#ffffff;
					border:1px solid #d0d7de;
					border-radius:8px;
					padding:10px 14px;
					min-width:135px;
					display:flex;
					justify-content:space-between;
					align-items:center;
					box-shadow:0 6px 18px rgba(0,0,0,.18);
				}
				.top-left .box:nth-child(4) {
					min-width:175px;
				}
				.top-right .box {
					min-width:175px;
				}
				.box span:first-child {
					font-weight:600;
					color:#374151;
				}
				.box span:last-child {
					font-size:26px;
					font-weight:700;
					color:#111827;
				}
				.unit {
					font-size:12px;
					font-weight:500;
					color:#6b7280;
					margin-left:2px;
				}

				/* Box colors */
				.top-left .box:nth-child(1) span:last-child { color:#0969da; } /* Total */
				.top-left .box:nth-child(2) span:last-child { color:#1a7f37; } /* Passed */
				.top-left .box:nth-child(3) span:last-child { color:#cf222e; } /* Failed */
				.top-left .box:nth-child(4) span:last-child { color:#6d47d7; } /* Time */
				.top-right .box:nth-child(1) span:last-child { color:#1a7f37; } /* % Passed */
				.top-right .box:nth-child(2) span:last-child { color:#cf222e; } /* % Failed */
				.top-right .box span:last-child {
					font-size:28px;
				}

				/* Search */
				input {
					width:340px;
					padding:8px 12px;
					border-radius:8px;
					border:1px solid #d0d7de;
				}

				/* Main */
				main {
					padding:0 16px 16px;
				}
				.section-title {
					margin:24px 0 10px;
					font-size:16px;
					font-weight:600;
				}

				/* Table */
				table {
					width:100%;
					border-collapse:collapse;
					background:#ffffff;
					border:1px solid #d0d7de;
					border-radius:8px;
					overflow:hidden;
					margin-bottom:8px;
					table-layout:fixed;
				}
				thead th {
					position:sticky;
					top:0;
					z-index:2;
					background:#d1d9e3;
					color:#1f2937;
					padding:8px 10px;
					font-size:12px;
					text-transform:uppercase;
					cursor:pointer;
					transition:background .15s ease;
				}
				thead th {
					text-align:left;
				}
				thead th:hover {
					background:#e2e8f0;
				}
				th:nth-child(5), th:nth-child(6) {
					cursor:default;
					pointer-events:none;
				}
				td {
					padding:8px 10px;
					border-bottom:1px solid #e5e7eb;
					text-align:left;
					white-space:nowrap;
					overflow:hidden;
					text-overflow:ellipsis;
				}
				tr.data-row {
					cursor:pointer;
				}

				/* Passed/failed styles */
				.section-title.pass + table tbody tr.data-row td {
					background:#f0faf4;
				}
				.section-title.pass + table tbody tr.data-row:hover td {
					background:#f6fdf9;
				}
				.section-title.fail + table tbody tr.data-row td {
					background:#fff5f4;
				}
				.section-title.fail + table tbody tr.data-row:hover td {
					background:#fffafa;
				}

				/* Status headers */
				.section-title.pass + table thead th {
					background:linear-gradient(180deg,#e6f6ec,#d1f0df);
					color:#0f5132;
					border-bottom:1px solid #b7e4c7;
				}
				.section-title.pass + table thead th:hover {
					background:linear-gradient(180deg,#f0faf4,#dcf5e6);
				}
				.section-title.fail + table thead th {
					background:linear-gradient(180deg,#fdecea,#fbd6d2);
					color:#842029;
					border-bottom:1px solid #f1aeb5;
				}
				.section-title.fail + table thead th:hover {
					background:linear-gradient(180deg,#fff5f4,#ffe2df);
				}


				/* Log */
				tr.failure-row td {
					background:#fffbea;
					white-space:normal;
					border-top:1px dashed #e5e7eb;
				}
				tr.failure-row:hover td {
					background:#fffbea;
				}
				tbody tr.failure-row:nth-child(even) td,
				tbody tr.failure-row:nth-child(odd) td {
					background:#fffbea;
				}
				tr.failure-row pre {
					margin:0;
					padding:10px;
					font-size:12px;
					white-space:pre-wrap;
					font-family:ui-monospace,Menlo,Consolas,monospace;
					background:transparent;
					color:#24292f;
				}

				/* Search */
				#search {
					width:360px;
					height:40px;
					padding:0 42px 0 14px;
					border-radius:999px;
					border:1px solid #cfd7e3;
					font-size:14px;
					line-height:40px;
					background:
					url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E")
					no-repeat calc(100% - 14px) 50%,
					#ffffff;
					background-size:18px;
				}
				#search:focus {
					outline:none;
					border-color:#0969da;
					box-shadow:0 6px 18px rgba(9,105,218,.25);
				}
				#search::placeholder {
					color:#6b7280;
					font-weight:500;
				}

				/* Footer */
				.table-count {
					text-align:right;
					font-size:13px;
					color:#255b97;
					margin-bottom:18px;
					padding-right:6px;
				}
				</style>
		</head>

		<body>
			<header>
				<h1>
					${AUTOMATION_TYPE} Automation Report ${
						ZIMBRA_VERSION ? `<span class="report-version">(${[ZIMBRA_VERSION, SERVER_HOST].filter(Boolean).join(', ')})</span>` : ''
					}
				</h1>

				<div class="top-bar">
					<div class="top-left">
						<div class="box"><span>Total</span><span>${total}</span></div>
						<div class="box"><span>Passed</span><span class="pass">${passed}</span></div>
						<div class="box"><span>Failed</span><span class="fail">${failed}</span></div>
						<div class="box"><span>Time</span><span>${elapsedMinutes} <span class="unit">min</span></span></div>
					</div>

					<div class="top-center">
						<input id="search" placeholder="Search suite or testcase..." onkeyup="filterTables()">
					</div>

					<div class="top-right">
						<div class="box"><span>% Passed</span><span class="pass">${passedPercent}%</span></div>
						<div class="box"><span>% Failed</span><span class="fail">${failedPercent}%</span></div>
					</div>
				</div>
			</header>

			<main>
				${failed > 0 ? `
					<h2 class="section-title fail">Failed Tests</h2>
					${buildTable('failedTable', failedTests)}
					<div class="table-count" id="failedTable-count"></div>
				` : ''}

				${passed > 0 ? `
					<h2 class="section-title pass">Passed Tests</h2>
					${buildTable('passedTable', passedTests)}
					<div class="table-count" id="passedTable-count"></div>
				` : ''}
			</main>

			<script>
			function sortTable(tableId, col) {
				if (col === 4 || col === 5) return;

				const table = document.getElementById(tableId);
				const tbody = table.tBodies[0];
				const rows = Array.from(tbody.querySelectorAll('tr.data-row'));
				const asc = table.dataset.asc !== '1';
				table.dataset.asc = asc ? '1' : '';

				rows.sort((a, b) => {
					if (col === 0) {
						const xi = parseInt(a.cells[0].dataset.index, 10);
						const yi = parseInt(b.cells[0].dataset.index, 10);
						return asc ? xi - yi : yi - xi;
					}

					const x = a.cells[col].innerText;
					const y = b.cells[col].innerText;
					if (col === 3) {
						return asc ? parseFloat(x) - parseFloat(y) : parseFloat(y) - parseFloat(x);
					}
					return asc ? x.localeCompare(y) : y.localeCompare(x);
				});

				rows.forEach(row => {
					const detail = document.getElementById(row.dataset.target);
					tbody.appendChild(row);
					if (detail) tbody.appendChild(detail);
				});
				updateCounts();
				if (col !== 0) {
					updateSerialNumbers(tableId);
				}
			}

			function filterTables() {
				const q = document.getElementById('search').value.toLowerCase();

				document.querySelectorAll('tr.data-row').forEach(row => {
					const match = row.innerText.toLowerCase().includes(q);
					row.classList.toggle('hidden', !match);

					const detail = document.getElementById(row.dataset.target);
					if (detail && !match) detail.classList.add('hidden');
				});
				updateSerialNumbers('failedTable');
				updateSerialNumbers('passedTable');
				updateCounts();
			}

			function updateCounts() {
				updateCount('failedTable', 'failed');
				updateCount('passedTable', 'passed');
			}

			function updateSerialNumbers(tableId) {
				const table = document.getElementById(tableId);
				if (!table) return;

				let index = 1;
				table.querySelectorAll('tbody tr.data-row:not(.hidden)').forEach(row => {
					row.querySelector('.serial').innerText = index++;
				});
			}

			function updateCount(id, label) {
				const table = document.getElementById(id);
				const counter = document.getElementById(id + '-count');
				if (!table || !counter) return;

				const total = table.querySelectorAll('tbody tr.data-row').length;
				const visible = table.querySelectorAll('tbody tr.data-row:not(.hidden)').length;
				counter.innerText = visible
					? 'Showing ' + visible + ' of ' + total + ' ' + label + ' tests'
					: '';
			}

			document.addEventListener('click', e => {
				const row = e.target.closest('.data-row');
				if (!row) return;
				const detail = document.getElementById(row.dataset.target);
				if (detail) detail.classList.toggle('hidden');
			});

			(function () {
				const failed = ${failed};
				const color = failed > 0 ? '#cf222e' : '#1a7f37';
				const letter = failed > 0 ? 'F' : 'P';

				const svg =
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
					'<rect width="16" height="16" rx="3" fill="' + color + '"/>' +
					'<text x="8" y="12" font-size="10" text-anchor="middle" fill="white">' +
					letter +
					'</text></svg>';

				document.getElementById('status-favicon').href =
					'data:image/svg+xml,' + encodeURIComponent(svg);
			})();

			updateSerialNumbers('failedTable');
			updateSerialNumbers('passedTable');
			updateCounts();

			document.addEventListener('DOMContentLoaded', () => {
				const search = document.getElementById('search');
				if (search) {
					search.value = '';
					filterTables();
				}
			});
			</script>
		</body>
	</html>`;
}