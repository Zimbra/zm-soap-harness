import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug60688', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const timezone = 'America/Los_Angeles';

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

		// Inject message with subject email02A and date May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email02A
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0

Content for email02A mdate test</content>
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
		// Get today's date for mdate search
		const now = new Date();
		const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

		// Search for email02A
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email02A)</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		const messageId = res1.SearchResponse?.m?.[0]?.id;

		// Search with mdate
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>mdate:"${dateStr}" is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});

	it('Sanity | Verify that a search for mdate - cuurentdate returns no message because there is no message newer than current date (Bug: 60888)', async () => {
		// Search for email02A first
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email02A)</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search for mdate after tomorrow - should be empty
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dateStr = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear()}`;

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>mdate:>${dateStr}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify that a search for mdate - cuurentdate - 1week returns no message becuase there is no message with mdate 1 week old for the user (Bug: 60888)', async () => {
		// Search for email02A
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email02A)</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search mdate -1week
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>mdate:-1week</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify that a search for mdate - cuurentdate 1week returns no message becuase there is no message with mdate - 1 week after for the user (Bug: 60888)', async () => {
		// Search for email02A
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email02A)</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search mdate +1week
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>mdate:+1week</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify that a search for date - 5, 15, 2005 returns the correct email message Moved that message to the trash and and search based on mdate (Bug: 60888)', async () => {
		// Search for email02A
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email02A)</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');
		const messageId = res1.SearchResponse?.m?.[0]?.id;

		// Move message to trash
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${messageId}" l="3" />
			</MsgActionRequest>`, accountAuthToken
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.MsgActionResponse, 'MsgActionResponse should exist');

		// Search with mdate
		const now = new Date();
		const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>mdate:"${dateStr}" is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// Search by date
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>date:(05/15/2005) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');
	});
});
