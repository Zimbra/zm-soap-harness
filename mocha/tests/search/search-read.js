import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Read', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data constants for invalid value testing
	const read_alpha = 'abcdef';
	const read_decimal = '1.5';
	const read_negative = '-1';
	const read_number = '12345';
	const read_spaces = '   ';
	const read_spchar = '!@#$%';
	const read_text = 'sometext';

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

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" f="u">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0
1</content>
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
	it('Functional | Verify read attribute of search by putting fetch 0 and read 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="0" read="1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>is:read</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify read attribute of search for read 0 (Bug: 6473, 16719)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="0">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		const part = res1.SearchResponse?.m?.[0]?.mp?.[0];
		assert.include(part?.content || part?.body, '1', 'body should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>is:unread</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify read attribute of search for read 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		const part = res1.SearchResponse?.m?.[0]?.mp?.[0];
		assert.include(part?.content || part?.body, '1', 'body should match');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>is:read</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Verify read attribute of search by putting invalid values of it (blank, spchar, integer negative, sometext, alpha, spaces, deciaml)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_spchar}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_number}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_negative}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_text}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_alpha}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_spaces}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="${read_decimal}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Verify read attribute of search by putting leading and trailing spaces with its value 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="   1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" read="1   ">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
