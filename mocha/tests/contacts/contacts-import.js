import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contacts Import', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});


	it('Functional | ImportContactsRequest from an account with 0 contacts imported', async () => {
		const csvHeader = '"Business City","Business Country","Business Fax","Business Phone","Business Phone 2","Business Postal Code","Business State","Business Street","Business Street 2","Business Street 3","Callback","Car Phone","Company","Company Main Phone","Department","E-mail Address","E-mail Display Name","E-mail Type","E-mail 2 Address","E-mail 2 Display Name","E-mail 2 Type","E-mail 3 Address","E-mail 3 Display Name","E-mail 3 Type","First Name","Home City","Home Country","Home Fax","Home Phone","Home Phone 2","Home Postal Code","Home State","Home Street","Home Street 2","Home Street 3","Initials","Job Title","Last Name","Middle Name","Mobile Phone","Notes","Other City","Other Country","Other Fax","Other Phone","Other Postal Code","Other State","Other Street","Other Street 2","Other Street 3","Pager","Suffix","Title","Web Page"';

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvHeader}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ImportContactsResponse, 'ImportContactsResponse should exist');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Import contacts from CSV', async () => {
		const csvData = `"Business City","Business Country","First Name","Last Name","E-mail Address"
"TestCity","TestCountry","TestFirst${common.getUniqueString()}","TestLast${common.getUniqueString()}","test${common.getUniqueString()}@domain.com"`;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvData}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ImportContactsResponse.cn, 'cn element should exist');
	});


	it('Functional | ImportContactsRequest to import several (5) contacts', async () => {
		let csvData = '"First Name","Last Name","E-mail Address"\n';
		for (let i = 0; i < 5; i++) {
			csvData += `"First${common.getUniqueString()}","Last${common.getUniqueString()}","email${common.getUniqueString()}@domain.com"\n`;
		}

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvData}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ImportContactsResponse.cn, 'cn element should exist');
	});


	it('Regression | ImportContactsRequest without ct header', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail">
				<content>"First Name","Last Name"</content>
			</ImportContactsRequest>`, accountToken, false
		);
		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | ImportContactsRequest with invalid ct values', async () => {
		const invalidTypes = ['abcd', '1234', '-1', '//\\\\|-', ''];
		for (const ct of invalidTypes) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<ImportContactsRequest xmlns="urn:zimbraMail" ct="${ct}">
					<content>"First Name","Last Name"</content>
				</ImportContactsRequest>`, accountToken, false
			);
			assert.exists(res.Fault, `ct="${ct}" should be a Fault`);
			const code = res.Fault?.Detail?.Error?.Code || '';
			assert.include(code, 'service.INVALID_REQUEST', `ct="${ct}" error code should be service.INVALID_REQUEST`);
		}
	});


	it('Regression | ImportContactsRequest with missing fields', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>"Business City","Business Country","Business Fax","Business Phone","Business Phone 2","Business Postal Code","Business State","Business Street","Business Street 2","Business Street 3","Callback","Car Phone","Company","Company Main Phone","Department","E-mail Address","E-mail Display Name","E-mail Type","E-mail 2 Address","E-mail 2 Display Name","E-mail 2 Type","E-mail 3 Address",""</content>
			</ImportContactsRequest>`, accountToken, false
		);
		assert.exists(res.Fault, 'Response should be a Fault');
	});


	it('Regression | ImportContactsRequest with invalid aid values', async () => {
		const invalidAids = ['abcd', '1234', '-1', '//\\\\|-', ''];
		for (const aid of invalidAids) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<ImportContactsRequest xmlns="urn:zimbraMail" ct="abcd">
					<content aid="${aid}">"First Name","Last Name"</content>
				</ImportContactsRequest>`, accountToken, false
			);
			assert.exists(res.Fault, `aid="${aid}" should be a Fault`);
		}
	});


	it('Functional | ImportContactsRequest with empty line in CSV', async () => {
		let csvData = '"First Name","Last Name","E-mail Address"\n';
		csvData += `"First${common.getUniqueString()}","Last${common.getUniqueString()}","email${common.getUniqueString()}@domain.com"\n`;
		csvData += '\n';

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvData}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ImportContactsResponse.cn, 'cn element should exist');
	});


	it('Functional | Import contacts with Thunderbird CSV format', async () => {
		const csvContent = 'First Name,Last Name,E-mail Address\nThunder' + common.getUniqueString() + ',Bird' + common.getUniqueString() + ',tb' + common.getUniqueString() + '@domain.com';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(importRes.Fault, 'Import should not be a Fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import contacts with empty content returns fault', async () => {
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content></content>
			</ImportContactsRequest>`, accountToken, false
		);
		assert.exists(importRes.Fault, 'Import empty should be a Fault');
	});


	it('Functional | Import contacts with multiple rows', async () => {
		let csvContent = '"First Name","Last Name","E-mail Address"';
		for (let i = 0; i < 5; i++) {
			csvContent += '\n"Bulk' + common.getUniqueString() + '","Import' + common.getUniqueString() + '","bulk' + common.getUniqueString() + '@domain.com"';
		}
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(importRes.Fault, 'Bulk import should not be a Fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});
});
