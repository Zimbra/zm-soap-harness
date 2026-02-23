import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Rename', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Rename an account with valid new-name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(renameRes.RenameAccountResponse,
			'Account should be renamed successfully');
	});


	it('Regression | Rename an account with blank new-name but correct domain', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>@${config.testDomain}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(renameRes.Fault, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with valid name and invalid domain', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>invaliddomain</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(renameRes.Fault, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with invalid name and invalid domain', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>invaliddomain</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(renameRes.Fault, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with invalid new-names (blank/spaces/spchar/sometext/negative/zero/largenumber)', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const invalidNames = ['', '             ', ":'<//\\\\", 'some text', '-1', '0', '12345678901234567890'];

		for (const invalidName of invalidNames) {
			const renameRes = await soap.makeSOAPEnvelopeAdmin(
				`<RenameAccountRequest xmlns="urn:zimbraAdmin">
					<id>${acctId}</id>
					<newName>${invalidName}</newName>
				</RenameAccountRequest>`, adminAuthToken
			);
			assert.exists(renameRes.Fault,
				`Should have a Fault for newName="${invalidName}"`);
			const code = renameRes.Fault.Detail.Error.Code;
			assert.isTrue(code.includes('service.INVALID_REQUEST') || code.includes('service.PARSE_ERROR'),
				`Should return INVALID_REQUEST or PARSE_ERROR for newName="${invalidName}", got: ${code}`);
		}
	});


	it('Smoke | Rename an account along with zimbraMailHost/zimbraMailTransport', async () => {
		const acctName = `test14.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `new14.${common.getUniqueString()}@${config.testDomain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = createRes.CreateAccountResponse.account[0];
		const acctId = acct.id;
		const mailHost = acct.a.find(a => a.n === 'zimbraMailHost')._content;

		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
				<a n="zimbraMailHost">${mailHost}</a>
				<a n="zimbraMailTransport">${mailHost}</a>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(renameRes.RenameAccountResponse,
			'Account should be renamed with mail host');
	});

});
