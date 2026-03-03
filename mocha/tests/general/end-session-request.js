import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > End Session Request', function () {
	this.timeout(30 * 1000);
	let adminAuthToken, accountEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
	it('Smoke | Verify basic EndSessionRequest', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// GetInfoRequest
		const getInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getInfoRes.Fault, 'GetInfoRequest should not be a Fault');
		assert.exists(getInfoRes.GetInfoResponse.name,
			'GetInfoResponse name should exist');

		// End the session
		const endSessionRes = await soap.makeSOAPEnvelopeAccount(
			'<EndSessionRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(endSessionRes.Fault, 'EndSessionRequest should not be a Fault');
	});


	it('Sanity | Verify basic EndSessionRequest - with no session created', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// End the session
		const endSessionRes = await soap.makeSOAPEnvelopeAccount(
			'<EndSessionRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(endSessionRes.Fault, 'EndSessionRequest should not be a Fault');
	});
});
