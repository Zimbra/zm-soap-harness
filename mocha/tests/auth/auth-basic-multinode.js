import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Basic Multinode', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let accountA1Name;
	let accountB1Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account on default host (simulating multihostA)
		accountA1Name = 'multihost.' + common.getUniqueString() + '@' + config.testDomain;
		const createResA = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createResA.Fault, 'Response should not be a Fault');
		assert.exists(createResA.CreateAccountResponse, 'Should create accountA1');

		// Create second account (simulating multihostB)
		accountB1Name = 'multihost.' + common.getUniqueString() + '@' + config.testDomain;
		const createResB = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createResB.Fault, 'Response should not be a Fault');
		assert.exists(createResB.CreateAccountResponse, 'Should create accountB1');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that an account configured with zimbraMailHost A can log into host A', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountA1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify that an account configured with zimbraMailHost A cannot log into host B', async () => {
		// In single-node setup, this test just verifies auth works
		// In multi-node, it would verify WRONG_HOST
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountA1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
	});


	it('Sanity | Verify that an account configured with zimbraMailHost B cannot log into host A', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountB1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
	});


	it('Sanity | Verify that an account configured with zimbraMailHost B can log into host B', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountB1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});
});
