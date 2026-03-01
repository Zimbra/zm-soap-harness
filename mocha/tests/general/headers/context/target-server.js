import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Context > Target Server', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account2Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Functional | Send a client request using targetServer', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
	});


	it('Functional | Send a client AuthRequest using targetServer', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});
});
