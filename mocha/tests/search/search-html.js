import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Html', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;
	let res;

	// Test data constants for invalid value testing
	const html_alpha = 'abcdef';
	const html_decimal = '1.5';
	const html_negative = '-1';
	const html_number = '12345';
	const html_spaces = '   ';
	const html_spchar = '!@#$%';
	const html_text = 'sometext';

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
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="----=_Part_123"

------=_Part_123
Content-Type: text/plain; charset=utf-8

1

------=_Part_123
Content-Type: text/html; charset=utf-8

						<html><body>1</body></html>
------=_Part_123--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify html attribute of search for html 1', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		const m = res.SearchResponse?.m?.[0];
		assert.exists(m, 'Message should exist');
		const htmlPart = m.mp?.[0]?.mp?.find(p => p.ct === 'text/html') || m.mp?.find(p => p.ct === 'text/html');
		assert.exists(htmlPart, 'HTML part should exist');
		// Verify empty result set
	});


	it('Sanity | Verify html attribute of search for html 0', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="0">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		const m = res.SearchResponse?.m?.[0];
		assert.exists(m, 'Message should exist');
		const plainPart = m.mp?.[0]?.mp?.find(p => p.ct === 'text/plain') || m.mp?.find(p => p.ct === 'text/plain');
		assert.exists(plainPart, 'Plain text part should exist');
	});


	it('Regression | Verify html attribute of search by putting invalid values(blank, spaces, spchar, number, negative, text, alphanumeric, decimal)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_spaces}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_spchar}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_number}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_negative}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_text}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_alpha}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="${html_decimal}">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Verify the response of query with fetch 0 and html 1', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="0" html="1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// Verify empty result set
	});


	it('Regression | Verify html attribute of search by putting leading and trailing spaces', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="    1">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="1" html="1     ">
				<query>message</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
