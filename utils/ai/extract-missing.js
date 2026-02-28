/**
 * Reads specified XML test cases and generates JS it() blocks for missing tests.
 * Outputs the JS code to add into each file.
 */
const fs = require('fs');

const xmlDir = 'data/soapvalidator/Admin/Accounts';

function readXml(file) {
	return fs.readFileSync(xmlDir + '/' + file, 'utf8');
}

function extractTestCase(xml, objectiveSubstring) {
	// Find the test_case containing the objective
	const regex = new RegExp('<t:test_case[^>]*>[\\s\\S]*?' + objectiveSubstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?</t:test_case>', 'g');
	const match = regex.exec(xml);
	return match ? match[0] : 'NOT FOUND: ' + objectiveSubstring;
}

// List all missing tests with their XML files
const missing = [
	{ xml: 'Account-Create01.xml', obj: 'wrong zimbraMailDelivery' },
	{ xml: 'Account-Delete.xml', obj: 'simultaneously' },
	{ xml: 'Account-Get.xml', obj: "multiple id" },
	{ xml: 'Bug39720.xml', obj: 'auth token lifetime' },
	{ xml: 'Modify-Account03.xml', obj: 'zimbraMailHost to some valid' },
	{ xml: 'Account-Create07.xml', obj: "zimbraDomainType='alias'" },
	{ xml: 'Account-Alias-Remove.xml', obj: 'without domain name' },
	{ xml: 'Account-Alias-Remove.xml', obj: 'non existing domain' },
	{ xml: 'Account-Alias-Remove.xml', obj: 'distribution list should also' },
	{ xml: 'Account-Count.xml', obj: 'Count Accounts for domain' },
];

for (const m of missing) {
	const xml = readXml(m.xml);
	const tc = extractTestCase(xml, m.obj);
	console.log('\n========= ' + m.xml + ' / ' + m.obj + ' =========');
	console.log(tc.substring(0, 800));
	console.log('...');
}
