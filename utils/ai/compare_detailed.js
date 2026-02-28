import fs from 'fs';
import path from 'path';

const xmlBase = 'C:/git/zm-soap-harness/data/soapvalidator/Folders';
const jsBase = 'C:/git/zm-soap-harness/mocha/tests/folders';

// Map XML files to JS files
const fileMap = [
	{ xml: 'Folder-Action.xml', js: 'folder-action.js' },
	{ xml: 'Folder-Create.xml', js: 'folder-create.js' },
	{ xml: 'Folder-Loop.xml', js: 'folder-loop.js' },
	{ xml: 'Folder-Nested-Loop.xml', js: 'folder-nested-loop.js' },
	{ xml: 'Folder-Retention-Policy.xml', js: 'folder-retention-policy.js' },
	{ xml: 'Folders.xml', js: 'folders.js' },
	{ xml: 'Folders-Get.xml', js: 'folders-get.js' },
	{ xml: 'Folders-Immutable.xml', js: 'folders-immutable.js' },
	{ xml: 'Itemaction-Folder.xml', js: 'itemaction-folder.js' },
	{ xml: 'Searchfolder-Action.xml', js: 'searchfolder-action.js' },
	{ xml: 'Searchfolder-Create.xml', js: 'searchfolder-create.js' },
	{ xml: 'Searchfolder-Get.xml', js: 'searchfolder-get.js' },
	{ xml: 'Searchfolder-Loop.xml', js: 'searchfolder-loop.js' },
	{ xml: 'Searchfolder-Modify.xml', js: 'searchfolder-modify.js' },
	{ xml: 'Sharing/GetEffectiveFolderPermsRequest-Basic.xml', js: 'sharing/geteffectivefolderpermsrequest-basic.js' },
	{ xml: 'Sharing/Sharing-Combine.xml', js: 'sharing/sharing-combine.js' },
	{ xml: 'Sharing/Sharing-Immutable.xml', js: 'sharing/sharing-immutable.js' },
	{ xml: 'Sharing/Sharing-Inherit.xml', js: 'sharing/sharing-inherit.js' },
	{ xml: 'Sharing/Sharing-Rights.xml', js: 'sharing/sharing-rights.js' },
	{ xml: 'Sharing/Sharing-ToAdmin.xml', js: 'sharing/sharing-toadmin.js' },
	{ xml: 'Sharing/Sharing-ToDomainAdmin.xml', js: 'sharing/sharing-todomainadmin.js' },
	{ xml: 'Mountpoint/Create-Mountpoint.xml', js: 'mountpoint/create-mountpoint.js' },
	{ xml: 'Mountpoint/FolderActionRequest-Mountpoint.xml', js: 'mountpoint/folderactionrequest-mountpoint.js' },
	{ xml: 'Mountpoint/Get-Mountpoint.xml', js: 'mountpoint/get-mountpoint.js' },
	{ xml: 'Mountpoint/Stale-Mountpoint.xml', js: 'mountpoint/stale-mountpoint.js' },
	{ xml: 'VirtualHost/VirtualHost-GetInfoRequest.xml', js: 'virtualhost/virtualhost-getinforequest.js' },
];

function getXmlTests(filePath) {
	const content = fs.readFileSync(filePath, 'utf-8');
	const tests = { smoke: [], sanity: [], functional: [], regression: [], setup: [] };

	// Match test_case elements with their attributes
	const regex = /<t:test_case\s+testcaseid="([^"]*)"[^>]*>/gi;
	let match;
	while ((match = regex.exec(content)) !== null) {
		const fullTag = match[0];
		const id = match[1];
		const typeMatch = fullTag.match(/type="([^"]*)"/i);
		const type = typeMatch ? typeMatch[1].toLowerCase() : '';

		// Extract objective
		const objStart = content.indexOf('<t:objective>', match.index);
		const objEnd = content.indexOf('</t:objective>', objStart);
		const objective = objStart >= 0 && objEnd >= 0
			? content.substring(objStart + 13, objEnd).trim().replace(/\s+/g, ' ')
			: id;

		if (type === 'always' || type === 'deprecated') {
			tests.setup.push({ id, objective, type });
		} else if (type === 'smoke') {
			tests.smoke.push({ id, objective });
		} else if (type === 'sanity') {
			tests.sanity.push({ id, objective });
		} else if (type === 'functional' || type === 'bhr') {
			tests.functional.push({ id, objective });
		} else if (type === 'regression') {
			tests.regression.push({ id, objective });
		} else {
			// Default to functional
			tests.functional.push({ id, objective, type });
		}
	}
	return tests;
}

function getJsTests(filePath) {
	const content = fs.readFileSync(filePath, 'utf-8');
	const tests = { smoke: [], sanity: [], functional: [], regression: [], other: [] };

	const regex = /it\(\s*['"`]([^'"`]+)['"`]/g;
	let match;
	while ((match = regex.exec(content)) !== null) {
		const name = match[1];
		const lower = name.toLowerCase();
		if (lower.startsWith('smoke')) tests.smoke.push(name);
		else if (lower.startsWith('sanity')) tests.sanity.push(name);
		else if (lower.startsWith('functional')) tests.functional.push(name);
		else if (lower.startsWith('regression')) tests.regression.push(name);
		else tests.other.push(name);
	}
	return tests;
}

// Generate report
let report = '# XML vs JS Test Comparison — Detailed Report\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;

let totalXml = 0, totalJs = 0;
let totalXmlByType = { smoke: 0, sanity: 0, functional: 0, regression: 0 };
let totalJsByType = { smoke: 0, sanity: 0, functional: 0, regression: 0 };
let matchedFiles = 0, mismatchedFiles = 0;
const mismatches = [];

report += '## Summary Table\n\n';
report += '| # | File | XML Sm | JS Sm | XML Sa | JS Sa | XML Fn | JS Fn | XML Rg | JS Rg | XML Total | JS Total | Status |\n';
report += '|---|------|--------|-------|--------|-------|--------|-------|--------|-------|-----------|----------|--------|\n';

for (let i = 0; i < fileMap.length; i++) {
	const entry = fileMap[i];
	const xmlPath = path.join(xmlBase, entry.xml);
	const jsPath = path.join(jsBase, entry.js);

	const xmlTests = getXmlTests(xmlPath);
	const jsTests = getJsTests(jsPath);

	const xmlCounts = {
		smoke: xmlTests.smoke.length,
		sanity: xmlTests.sanity.length,
		functional: xmlTests.functional.length,
		regression: xmlTests.regression.length,
	};
	const jsCounts = {
		smoke: jsTests.smoke.length,
		sanity: jsTests.sanity.length,
		functional: jsTests.functional.length,
		regression: jsTests.regression.length,
	};

	const xmlTotal = xmlCounts.smoke + xmlCounts.sanity + xmlCounts.functional + xmlCounts.regression;
	const jsTotal = jsCounts.smoke + jsCounts.sanity + jsCounts.functional + jsCounts.regression + jsTests.other.length;

	totalXml += xmlTotal;
	totalJs += jsTotal;
	for (const t of ['smoke', 'sanity', 'functional', 'regression']) {
		totalXmlByType[t] += xmlCounts[t];
		totalJsByType[t] += jsCounts[t];
	}

	const match = xmlTotal === jsTotal;
	if (match) matchedFiles++; else mismatchedFiles++;

	const status = match ? '✅' : `⚠️ ${jsTotal > xmlTotal ? '+' : ''}${jsTotal - xmlTotal}`;
	const baseName = entry.js.replace(/.*\//, '');

	report += `| ${i + 1} | ${baseName} | ${xmlCounts.smoke} | ${jsCounts.smoke} | ${xmlCounts.sanity} | ${jsCounts.sanity} | ${xmlCounts.functional} | ${jsCounts.functional} | ${xmlCounts.regression} | ${jsCounts.regression} | ${xmlTotal} | ${jsTotal} | ${status} |\n`;

	if (!match) {
		mismatches.push({ entry, xmlTests, jsTests, xmlCounts, jsCounts, xmlTotal, jsTotal });
	}
}

report += `| | **TOTALS** | **${totalXmlByType.smoke}** | **${totalJsByType.smoke}** | **${totalXmlByType.sanity}** | **${totalJsByType.sanity}** | **${totalXmlByType.functional}** | **${totalJsByType.functional}** | **${totalXmlByType.regression}** | **${totalJsByType.regression}** | **${totalXml}** | **${totalJs}** | |\n\n`;

report += `**Matched:** ${matchedFiles}/26 files | **Mismatched:** ${mismatchedFiles}/26 files\n\n`;

// Detail section for mismatches
if (mismatches.length > 0) {
	report += '---\n\n## Detailed Mismatch Analysis\n\n';

	for (const m of mismatches) {
		const diff = m.jsTotal - m.xmlTotal;
		report += `### ${m.entry.js} (XML: ${m.xmlTotal}, JS: ${m.jsTotal}, Diff: ${diff > 0 ? '+' : ''}${diff})\n\n`;

		// Show per-type breakdown
		for (const type of ['smoke', 'sanity', 'functional', 'regression']) {
			const xc = m.xmlCounts[type];
			const jc = m.jsCounts[type];
			if (xc !== jc) {
				report += `**${type.charAt(0).toUpperCase() + type.slice(1)}:** XML=${xc}, JS=${jc}\n\n`;
			}
		}

		// List XML test objectives
		report += '<details><summary>XML Test Objectives</summary>\n\n';
		for (const type of ['smoke', 'sanity', 'functional', 'regression']) {
			if (m.xmlTests[type].length > 0) {
				for (const t of m.xmlTests[type]) {
					report += `- [${type}] ${t.objective}\n`;
				}
			}
		}
		report += '\n</details>\n\n';

		// List JS test names
		report += '<details><summary>JS Test Names</summary>\n\n';
		for (const type of ['smoke', 'sanity', 'functional', 'regression', 'other']) {
			if (m.jsTests[type].length > 0) {
				for (const t of m.jsTests[type]) {
					report += `- ${t}\n`;
				}
			}
		}
		report += '\n</details>\n\n';
	}
}

fs.writeFileSync('C:/git/zm-soap-harness/utils/ai/comparison-report.md', report);
console.log(report);
console.log('\nReport saved to utils/ai/comparison-report.md');
