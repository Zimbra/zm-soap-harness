import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Request Id > Batch Request', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const accountEmail = `account1${common.getUniqueString()}@${config.testDomain}`;

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
	it('Sanity | Verify that the RequestId in a BatchRequest are returned correctly 1', async () => {
		// BatchRequest
		const batchRes = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="continue">
				<GetFolderRequest xmlns="urn:zimbraMail" requestId="1"/>
				<SyncRequest xmlns="urn:zimbraMail" requestId="2"/>
			</BatchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(batchRes.Fault, 'BatchRequest should not fault');
		assert.exists(batchRes.BatchResponse, 'BatchResponse should exist');
	});


	it('Functional | Verify that the RequestId in a BatchRequest are returned correctly 2', async () => {
		const requestId1 = common.getUniqueString();
		const requestId2 = common.getUniqueString();

		// Send batch request
		const batchRes = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="continue">
				<GetFolderRequest xmlns="urn:zimbraMail" requestId="${requestId1}"/>
				<SyncRequest xmlns="urn:zimbraMail" requestId="${requestId2}"/>
			</BatchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(batchRes.Fault, 'BatchRequest should not fault');
		assert.exists(batchRes.BatchResponse, 'BatchResponse should exist');
	});
});
