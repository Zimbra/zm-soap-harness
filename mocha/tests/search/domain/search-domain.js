import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Domain > Domain', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;
	const message = {};

	const mail2Subject = `mail2_${common.getUniqueString()}`;
	const mail3Subject = `mail3_${common.getUniqueString()}`;

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

		// Inject message from yahoo.co.in domain
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@yahoo.co.in
To: ${accountEmail}
Subject: ${mail2Subject}
MIME-Version: 1.0
Content for mail2 yahoo domain</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// Inject message from rediff.com domain
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@rediff.com
To: ${accountEmail}
Subject: ${mail3Subject}
MIME-Version: 1.0
Content for mail3 rediff domain</content>
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
	it('Functional | Login as the appropriate test account', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail2Subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');
		message.id2 = res2.SearchResponse?.m?.[0].id;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:(${mail3Subject}) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');
		message.id3 = res3.SearchResponse?.m?.[0].id;
	});


	it('Functional | Verify that a search for specific domain is successful', async () => {
		// SearchRequest - yahoo.co.in
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(@yahoo.co.in) </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');
		assert.exists(res1.SearchResponse?.m?.[0]?.su, 'su should exist');

		// SearchRequest - rediff.com
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(@rediff.com)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');
		assert.exists(res2.SearchResponse?.m?.[0]?.su, 'su should exist');
	});


	it('Functional | Verify that a search for two domains with ORing is successful', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(@yahoo.co.in OR @rediff.com)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for domains with both ANDing and ORing is successful', async () => {
		// SearchRequest - OR + AND yahoo
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(@yahoo.co.in OR @rediff.com) AND from:(@yahoo.co.in)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');
		assert.exists(res1.SearchResponse?.m?.[0]?.su, 'su should exist');

		// SearchRequest - OR + AND rediff
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> from:(@yahoo.co.in OR @rediff.com) from:(@rediff.com)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');
		assert.exists(res2.SearchResponse?.m?.[0]?.su, 'su should exist');
	});
});
