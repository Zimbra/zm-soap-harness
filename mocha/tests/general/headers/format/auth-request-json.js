import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('General > Headers > Format > Auth Request JSON', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountEmail;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		accountEmail = `user${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | JSON - authenticate with format type js', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});
});
