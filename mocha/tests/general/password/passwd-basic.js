import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Password > Passwd Basic', function () {
	this.timeout(60 * 1000);
	let accountEmail;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Basic test - user changes his password', async () => {
		const tmpPassword = 'bogus123';

		// Authenticate account
		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Verify response
		assert.exists(authRes, 'Auth token should exist');

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Authenticate account
		const newAuthRes = await soap.getAccountAuthToken(accountEmail, tmpPassword);

		// Verify response
		assert.exists(newAuthRes, 'Should be able to login with new password');
	});
});
