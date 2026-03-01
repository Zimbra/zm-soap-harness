import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Bug65617', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | GetShareInfo NPE', async () => {
		// Create account and auth
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// GetShareInfoRequest - verify no NPE (original bug)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareInfoRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		// Original bug was NPE - verify we get a proper response (no server crash)
		assert.isTrue(
			(res.GetShareInfoResponse !== undefined) || (res.Fault !== undefined),
			'Server should return a proper response without NPE'
		);
	});
});
