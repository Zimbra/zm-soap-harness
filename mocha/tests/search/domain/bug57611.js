import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Domain > Bug57611', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

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

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0

Test content</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Advance search should not partial domain', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(@yahoo.co.in) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m?.[0].su, 'su should match pattern');
		assert.exists(res2.SearchResponse?.m?.[0].su, 'su should match pattern');
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');

		// BrowseRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="domains">
            </BrowseRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.equal(res3.BrowseResponse.bd, 'foo.com', 'Value should match');
		assert.equal(res3.BrowseResponse.bd, 'rediff.com', 'Value should match');
		assert.equal(res3.BrowseResponse.bd, 'example.com', 'Value should match');
		assert.equal(res3.BrowseResponse.bd, 'yahoo.co.in', 'Value should match');
		// Verify empty result set
		// Verify empty result set
		// Verify empty result set
		// Verify empty result set
		// Verify empty result set
		// Verify empty result set
		// Verify empty result set
	});
});
