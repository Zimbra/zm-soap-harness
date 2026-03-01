import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > NoOp > No Operation', function () {
	this.timeout(30 * 1000);
	let accountAuthToken, accountEmail;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

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
	it('Smoke | Send NoOpRequest with auth-token', async () => {
		// NoOpRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.NoOpResponse,
			'NoOpResponse should exist');
	});


	it('Sanity | Send NoOpRequest with auth-token obtained in test-account', async () => {
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.NoOpResponse,
			'NoOpResponse should exist');
	});
});
