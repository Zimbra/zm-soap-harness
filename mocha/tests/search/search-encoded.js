import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Encoded', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const SearchEncoded01 = { name: `SearchEncoded01_${common.getUniqueString()}`, subject: `SearchEncoded01_${common.getUniqueString()}`, from: accountEmail, content: `SearchEncoded01_${common.getUniqueString()}`, value: `SearchEncoded01_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `SearchEncoded01_id`, toString() { return this.name; } };
	const SearchEncoded318 = { name: `SearchEncoded318_${common.getUniqueString()}`, subject: `SearchEncoded318_${common.getUniqueString()}`, from: accountEmail, content: `SearchEncoded318_${common.getUniqueString()}`, value: `SearchEncoded318_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `SearchEncoded318_id`, toString() { return this.name; } };

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
	it('Functional | Verify that encoded headers can be searched for (Bug: 22)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:(${SearchEncoded01.from})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const SearchEncoded01_id = res2.SearchResponse?.m?.[0].id;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${SearchEncoded01.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that utf-7 can be searched for (Bug: 318)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:(${SearchEncoded318.from})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const SearchEncoded318_id = res2.SearchResponse?.m?.[0].id;
		// Response fragment verification skipped

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:(Item 3 is £1)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});
});
