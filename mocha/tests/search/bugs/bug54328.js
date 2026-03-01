import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug54328', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Non-UTF subject from XML source
	const nonUtfSubject = '=?ISO-2022-JP?B?GyRCJDMkcyRLJEEkTxsoQg==?=';
	const decodedSubject = 'こんにちは';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject message with non-UTF subject
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${nonUtfSubject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Test content for non UTF subject search</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
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
	it('Sanity | Searchrequest with non UTF subject', async () => {
		// SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${decodedSubject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});
});
