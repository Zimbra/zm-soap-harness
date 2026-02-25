import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Lastlogon > Get Account Request', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify zimbraLastLogonTimestamp is not set for accounts that have not been authenticated', async () => {
		const acctName = `user${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id) : createRes.CreateAccountResponse?.account?.id);

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetAccountResponse);

		const attrs = getRes.GetAccountResponse.account[0].a || [];
		const lastLogon = attrs.find(a => a.n === 'zimbraLastLogonTimestamp');
		assert.notExists(lastLogon,
			'zimbraLastLogonTimestamp should not be set before login');
	});


	it('Functional | Verify zimbraLastLogonTimestamp is set once the account authenticates', async () => {
		const acctName = `user${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id) : createRes.CreateAccountResponse?.account?.id);

		// Login as user
		await soap.getAccountAuthToken(acctName, config.accountPassword);
		await common.sleep(2000);

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetAccountResponse);

		const attrs = getRes.GetAccountResponse.account[0].a || [];
		const lastLogon = attrs.find(a => a.n === 'zimbraLastLogonTimestamp');
		assert.exists(lastLogon, 'zimbraLastLogonTimestamp should be set after login');
		assert.include(lastLogon._content, 'Z', 'Timestamp should contain Z');
	});
});
