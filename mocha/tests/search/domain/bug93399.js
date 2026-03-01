import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Domain > Bug93399', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | BrowseRequest regex expression used blindly gives an error (Bug: 93399)', async () => {
		// BrowseRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest regex=".*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*822" browseBy="domains" xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		if (res.Fault) {
			assert.exists(res.Fault, 'Response should be a Fault');
		} else {
			assert.exists(res.BrowseResponse, 'BrowseResponse should exist');
		}
	});
});
