import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > MailingList > Paging', function () {
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
	it('Functional | Verify search paging takes the conversation subject into account (Bug: 37344)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" sortBy="subjAsc" offset="0" limit="100" query="in:inbox" types="conversation">
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.equal(res2.sf, 'CANCELED APPTS STILL SHOW ON ATTENDEE CALENDARS', 'sf should match');
		const conversation1_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.sf, 'CANNOT SEE ALL ATTENDEES FOR MEETINGS WITH MANY ATTENDEES', 'sf should match');
		const conversation2_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.sf, 'CREATING APPOINTMENTS IN ICAL DOES NOT SEND THE INVITE', 'sf should match');
		const conversation3_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.sf, 'DOGFOOD MAILBOXLOG SCAN RESULT', 'sf should match');
		const conversation4_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.sf, 'I18N/L10N:LOCALISE UI OF ZCOLOGCTL.EXE', 'sf should match');
		const conversation5_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.sf, 'INCORRECT MESSAGE INCLUDED AS PART OF CONVERSATION', 'sf should match');
		const conversation6_id = res2.SearchResponse?.m?.[0].id;
		assert.equal(res2.SearchResponse.sf, 'CANCELED APPTS STILL SHOW ON ATTENDEE CALENDARS', 'sf should match');
		conversation1_id = res2.SearchResponse.id;
		assert.exists(res2.SearchResponse, 'Response element should exist');
		assert.equal(res2.c[1].sf, 'CANNOT SEE ALL ATTENDEES FOR MEETINGS WITH MANY ATTENDEES', 'sf should match');
		conversation2_id = res2.c[1].id;
		assert.exists(res2.c[1], 'Response element should exist');
		assert.equal(res2.c[2].sf, 'CREATING APPOINTMENTS IN ICAL DOES NOT SEND THE INVITE', 'sf should match');
		conversation3_id = res2.c[2].id;
		assert.exists(res2.c[2], 'Response element should exist');
		assert.equal(res2.c[3].sf, 'DOGFOOD MAILBOXLOG SCAN RESULT', 'sf should match');
		conversation4_id = res2.c[3].id;
		assert.exists(res2.c[3], 'Response element should exist');
		assert.equal(res2.c[4].sf, 'I18N/L10N:LOCALISE UI OF ZCOLOGCTL.EXE', 'sf should match');
		conversation5_id = res2.c[4].id;
		assert.exists(res2.c[4], 'Response element should exist');
		assert.equal(res2.c[5].sf, 'INCORRECT MESSAGE INCLUDED AS PART OF CONVERSATION', 'sf should match');
		conversation6_id = res2.c[5].id;
		assert.exists(res2.c[5], 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="2">
			<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="2" limit="2">
			<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="4" limit="2">
			<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'Response element should exist');
	});
});
