const fs = require('fs');
const path = require('path');

const xmlDir = 'data/soapvalidator/Admin/Accounts';
const jsDir = 'mocha/tests/admin/accounts';
const dryRun = process.argv.includes('--dry-run');
const output = [];
let totalFixed = 0;

// XML to JS file name mapping
function xmlToJsName(xmlFile) {
	return xmlFile.replace('.xml', '')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
		.toLowerCase()
		.replace(/_/g, '-')
		.replace(/\s+/g, '-')
		+ '.js';
}

// Known manual mappings
const manualMap = {
	'Account-Alias-Add.xml': 'account-alias-add.js',
	'Account-Alias-Remove.xml': 'account-alias-remove.js',
	'Account-Count.xml': 'account-count.js',
	'Account-Create-Sphchar.xml': 'create-account-sphchar.js',
	'Account-Create01.xml': 'create-account-01.js',
	'Account-Create02.xml': 'create-account-02.js',
	'Account-Create03.xml': 'create-account-03.js',
	'Account-Create04.xml': 'create-account-04.js',
	'Account-Create05.xml': 'create-account-05.js',
	'Account-Create06.xml': 'create-account-06.js',
	'Account-Create07.xml': 'create-account-07.js',
	'Account-Delete.xml': 'account-delete.js',
	'Account-Device-Reminder-Set-Unset.xml': 'account-device-reminder.js',
	'Account-Get.xml': 'account-get.js',
	'Account-Getinfo.xml': 'account-getinfo.js',
	'Account-Getmembership.xml': 'account-getmembership.js',
	'Account-Rename.xml': 'account-rename.js',
	'AccountLoggerRequest.xml': 'account-logger.js',
	'AccountRequest.xml': 'account-request.js',
	'Accounts-Loop.xml': 'accounts-loop.js',
	'Bug39720.xml': 'bug-39720.js',
	'CountAccountRequest.xml': 'count-account-request.js',
	'CreateAccountMulitnode1.xml': 'create-account-multinode-1.js',
	'CreateAccountMulitnode2.xml': 'create-account-multinode-2.js',
	'CreateAccountMulitnode3.xml': 'create-account-multinode-3.js',
	'GetAccountMultinode.xml': 'get-account-multinode.js',
	'GetAllAdminAccountsRequest.xml': 'get-all-admin-accounts.js',
	'Modify-Account01.xml': 'modify-account-01.js',
	'Modify-Account02.xml': 'modify-account-02.js',
	'Modify-Account03.xml': 'modify-account-03.js',
	'Modify-Account04.xml': 'modify-account-04.js',
	'Modify-Account05.xml': 'modify-account-05.js',
	'ReloadAccountRequest_Basic.xml': 'reload-account.js',
	'Retention-Policy.xml': 'retention-policy.js',
	'account_migration.xml': 'account-migration.js',
	// Subdirs
	'Addressbook-Size-Limit.xml': 'addressbook-size-limit.js',
	'Account-Create.xml': 'account-create.js',
	'Account-Get.xml': 'account-get.js',
	'Account-Getmembership.xml': 'account-getmembership.js',
	'Account-Modify.xml': 'account-modify.js',
	'BackupRequest.xml': 'backup-request.js',
	'Resource-Create.xml': 'resource-create.js',
	'Resource-Get.xml': 'resource-get.js',
	'Resource-Modify.xml': 'resource-modify.js',
	'SearchDirectoryRequest.xml': 'search-directory-request.js',
	'AuthRequest.xml': 'auth-request.js',
	'ForeignPrincipal-AuthRequest.xml': 'foreign-principal-auth-request.js',
	'GetAccountRequest.xml': 'get-account-request.js',
	'Preauth-AuthRequest.xml': 'preauth-auth-request.js',
	'Multihost-Account-Create.xml': 'multihost-account-create.js',
	'ZimbraQuotaWarnMessage.xml': 'zimbra-quota-warn-message.js',
};

const typeMap = { smoke: 'Smoke', sanity: 'Sanity', functional: 'Functional', regression: 'Regression', bhr: 'Functional', dev_sanity: 'Smoke' };

function processDir(xmlDirPath, jsDirPath) {
	const entries = fs.readdirSync(xmlDirPath, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			const subXml = path.join(xmlDirPath, entry.name);
			const subJs = path.join(jsDirPath, entry.name.toLowerCase());
			if (fs.existsSync(subJs)) processDir(subXml, subJs);
			continue;
		}
		if (!entry.name.endsWith('.xml')) continue;

		const jsFileName = manualMap[entry.name];
		if (!jsFileName) {
			output.push(`SKIP: No mapping for ${entry.name}`);
			continue;
		}

		const jsPath = path.join(jsDirPath, jsFileName);
		if (!fs.existsSync(jsPath)) {
			output.push(`SKIP: JS file not found: ${jsPath}`);
			continue;
		}

		const xmlContent = fs.readFileSync(path.join(xmlDirPath, entry.name), 'utf8');
		let jsContent = fs.readFileSync(jsPath, 'utf8');

		// Extract XML test cases
		const tcRegex = /<t:test_case[^>]*testcaseid="([^"]*)"[^>]*type="([^"]*)"[^>]*>[\s\S]*?<t:objective>([\s\S]*?)<\/t:objective>/g;
		let match;
		const xmlTests = [];
		while ((match = tcRegex.exec(xmlContent)) !== null) {
			const [, id, type, objective] = match;
			if (type === 'always') continue;
			xmlTests.push({ id, type, objective: objective.trim().replace(/\s+/g, ' ') });
		}
		if (xmlTests.length === 0) continue;

		const expectedNames = xmlTests.map(t => {
			const prefix = typeMap[t.type] || t.type;
			return prefix + ' | ' + t.objective;
		});

		// Extract JS test names
		const itRegex = /it\('([^']+)'/g;
		let itMatch;
		const jsTestNames = [];
		while ((itMatch = itRegex.exec(jsContent)) !== null) {
			jsTestNames.push({ name: itMatch[1], start: itMatch.index });
		}

		if (jsTestNames.length !== xmlTests.length) {
			output.push(`\nWARN: ${entry.name} -> ${jsFileName}: count mismatch XML=${xmlTests.length} JS=${jsTestNames.length}`);
			continue;
		}

		// Fix mismatches
		let fixCount = 0;
		let newContent = jsContent;
		// Process in reverse to preserve offsets
		for (let i = jsTestNames.length - 1; i >= 0; i--) {
			if (jsTestNames[i].name !== expectedNames[i]) {
				const oldStr = "it('" + jsTestNames[i].name + "'";
				const newStr = "it('" + expectedNames[i] + "'";
				const idx = newContent.indexOf(oldStr, i === 0 ? 0 : jsTestNames[i].start - 5);
				if (idx !== -1) {
					newContent = newContent.substring(0, idx) + newStr + newContent.substring(idx + oldStr.length);
					fixCount++;
				} else {
					output.push(`  FAIL to find: ${oldStr}`);
				}
			}
		}

		if (fixCount > 0) {
			output.push(`\n${jsFileName}: ${fixCount} test names fixed`);
			if (!dryRun) {
				fs.writeFileSync(jsPath, newContent, 'utf8');
			}
			totalFixed += fixCount;
		}
	}
}

processDir(xmlDir, jsDir);
output.push(`\nTotal: ${totalFixed} test names ${dryRun ? 'would be' : ''} fixed`);
fs.writeFileSync('utils/ai/objective-fix-report.txt', output.join('\n'), 'utf8');
console.log(output.join('\n'));
