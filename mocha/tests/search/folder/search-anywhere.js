import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Folder > Search Anywhere', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	const email17ASubject = `email17A_${common.getUniqueString()}`;
	const email17BSubject = `email17B_${common.getUniqueString()}`;
	const email17CSubject = `email17C_${common.getUniqueString()}`;
	const email17DSubject = `email17D_${common.getUniqueString()}`;
	const email17ESubject = `email17E_${common.getUniqueString()}`;
	const message1Content = `message1_${common.getUniqueString()}`;

	let email17AId, email17BId, email17CId, email17DId, email17EId;

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

		// Inject 5 test messages (email17A-E) with "Now" content for content:(Now) search
		const subjects = [email17ASubject, email17BSubject, email17CSubject, email17DSubject, email17ESubject];
		for (const subj of subjects) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender@example.com
To: ${accountEmail}
Subject: ${subj}
MIME-Version: 1.0
Now is the time for all good men to come to the aid of their country.</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}
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
	it('Functional | Create setup for the Search Request (Bug: 2395)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set prefs to include spam and trash in search
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">TRUE</pref>
				<pref name="zimbraPrefIncludeTrashInSearch">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.ModifyPrefsResponse, 'Response element should exist');

		// Search and get IDs for all 5 messages
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${email17ASubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');
		email17AId = res3.SearchResponse?.m?.[0]?.id;

		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${email17BSubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');
		email17BId = res4.SearchResponse?.m?.[0]?.id;

		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${email17CSubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');
		email17CId = res5.SearchResponse?.m?.[0]?.id;

		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${email17DSubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');
		email17DId = res6.SearchResponse?.m?.[0]?.id;

		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${email17ESubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');
		email17EId = res7.SearchResponse?.m?.[0]?.id;

		// Move email17D to trash (folder id=3)
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${email17DId}" op="move" l="3"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		const msgAction = Array.isArray(res9.MsgActionResponse.action)
			? res9.MsgActionResponse.action[0] : res9.MsgActionResponse.action;
		assert.exists(msgAction, 'MsgActionResponse should contain action');

		// Move email17E to junk (folder id=4)
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${email17EId}" op="move" l="4"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(res10.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify that a search for query is - anywhere finds all mails', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:anywhere </query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a combination search for query content - (Now) is - anywhere finds all mails (Bug: 2445)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(Now) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:anywhere </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');

		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:(Now) is:anywhere </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that an is - anywhere finds trashed mails (Bug: 15160)', async () => {
		// Inject message into inbox (folder id=2)
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: foo@example.com
From: bar@example.com
Subject: email17G
Date: Wed, 15 Aug 2007 10:11:05 -0700 (PDT)
MIME-Version: 1.0
${message1Content}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const message1Id = res1.AddMsgResponse?.m?.[0]?.id || res1.AddMsgResponse?.m?.id;

		// Search for the message
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email17G)</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// Move message to trash (folder id=3)
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message1Id}" op="move" l="3"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const msgAction = Array.isArray(res3.MsgActionResponse.action)
			? res3.MsgActionResponse.action[0] : res3.MsgActionResponse.action;
		assert.exists(msgAction, 'MsgActionResponse should contain action');

		// Search with is:anywhere - should find trashed mail
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email17G) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that under and not under quesry works fine (Bug: 34265)', async () => {
		// Search under:INBOX
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> under:INBOX </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// Search not under:INBOX
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> not under:INBOX </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
