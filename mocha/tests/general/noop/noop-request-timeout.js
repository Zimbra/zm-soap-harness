import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > NoOp > NoOp Request Timeout', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;

	before(async function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send NoOpRequest with timeout, verify the response is returned within timeout (bug 33803)', async () => {
		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// NoOpRequest
		await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const startTime = Date.now();

		// NoOpRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail" wait="1" timeout="35000"/>',
			accountAuthToken
		);
		const elapsed = Date.now() - startTime;

		// Verify response
		assert.notExists(res.Fault, 'NoOpRequest should not fault: ' + JSON.stringify(res.Fault));
		assert.exists(res.NoOpResponse,
			'NoOpResponse should exist');
		assert.isBelow(elapsed, 50000,
			'Response should return within the timeout period');
	});
});
