import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Auth > Delegate Auth', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Smoke | Sanity test for DelegateAuthRequest', async () => {
		// Create a test account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(createRes.CreateAccountResponse, 'CreateAccountResponse should exist');

		// Delegate auth for the created account
		const delegateRes = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${accountEmail}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);

		// Verify delegate auth token is returned
		assert.notExists(delegateRes.Fault, 'DelegateAuthRequest should not fault');
		assert.exists(delegateRes.DelegateAuthResponse, 'DelegateAuthResponse should exist');
		assert.exists(delegateRes.DelegateAuthResponse.authToken, 'authToken should exist');
	});
});
