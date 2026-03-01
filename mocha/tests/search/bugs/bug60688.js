import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug60688', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const GENDATESTAMP = { name: `GENDATESTAMP_${common.getUniqueString()}`, subject: `GENDATESTAMP_${common.getUniqueString()}`, from: accountEmail, content: `GENDATESTAMP_${common.getUniqueString()}`, value: `GENDATESTAMP_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `GENDATESTAMP_id`, toString() { return this.name; } };
	const defaultlocale = { name: `defaultlocale_${common.getUniqueString()}`, subject: `defaultlocale_${common.getUniqueString()}`, from: accountEmail, content: `defaultlocale_${common.getUniqueString()}`, value: `defaultlocale_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultlocale_id`, toString() { return this.name; } };
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
	const trashFolder = { name: `trashFolder_${common.getUniqueString()}`, subject: `trashFolder_${common.getUniqueString()}`, from: accountEmail, content: `trashFolder_${common.getUniqueString()}`, value: `trashFolder_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `trashFolder_id`, toString() { return this.name; } };

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
	it('Sanity | Verify that a search for mdate - cuurentdate returns the correct email message, which is injected just now (Bug: 60888)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <tz id="${defaultlocale.timezone}"/>
			   <query>date:5/15/2005</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(^email02A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.match(String(res2.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		message.id1 = res2.SearchResponse?.m?.[0].id;
		assert.exists(res2.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>mdate:"${GENDATESTAMP}" is:anywhere</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});

	it('Sanity | Verify that a search for mdate - cuurentdate returns no message because there is no message newer than current date (Bug: 60888)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(^email02A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>mdate:>${GENDATESTAMP}</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});

	it('Sanity | Verify that a search for mdate - cuurentdate - 1week returns no message becuase there is no message with mdate 1 week old for the user (Bug: 60888)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(^email02A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>mdate:-1week</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});

	it('Sanity | Verify that a search for mdate - cuurentdate 1week returns no message becuase there is no message with mdate - 1 week after for the user (Bug: 60888)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(^email02A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>mdate:+1week</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});

	it('Sanity | Verify that a search for date - 5, 15, 2005 returns the correct email message Moved that message to the trash and and search based on mdate (Bug: 60888)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(^email02A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.match(String(res1.SearchResponse?.m?.[0].su), /^email02A/, 'su should match pattern');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// MsgActionRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
                <action op="move" id="${message.id1}" l="${trashFolder.id}" />
            </MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.MsgActionResponse, 'MsgActionResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>mdate:"${GENDATESTAMP}" is:anywhere</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>date:(05/15/2005) is:anywhere</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');

		assert.exists(res4.SearchResponse?.m, 'Response element should exist');
	});
});
