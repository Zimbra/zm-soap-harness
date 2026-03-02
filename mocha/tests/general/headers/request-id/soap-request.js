import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Request ID > Soap Request', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const accountEmail = `change${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Verify that the RequestId in a single soap request is returned correctly 1', async () => {
		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail" requestId="1"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
	});


	it('Functional | Verify that the RequestId in a single soap request is returned correctly 2', async () => {
		const requestId = common.getUniqueString();

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" requestId="${requestId}"/>`,
			accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
	});
});
