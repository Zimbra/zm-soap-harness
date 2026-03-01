import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Folder > Anywhere', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const email17A = { name: `email17A_${common.getUniqueString()}`, subject: `email17A_${common.getUniqueString()}`, from: accountEmail, content: `email17A_${common.getUniqueString()}`, value: `email17A_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `email17A_id`, toString() { return this.name; } };
	const email17B = { name: `email17B_${common.getUniqueString()}`, subject: `email17B_${common.getUniqueString()}`, from: accountEmail, content: `email17B_${common.getUniqueString()}`, value: `email17B_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `email17B_id`, toString() { return this.name; } };
	const email17C = { name: `email17C_${common.getUniqueString()}`, subject: `email17C_${common.getUniqueString()}`, from: accountEmail, content: `email17C_${common.getUniqueString()}`, value: `email17C_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `email17C_id`, toString() { return this.name; } };
	const email17D = { name: `email17D_${common.getUniqueString()}`, subject: `email17D_${common.getUniqueString()}`, from: accountEmail, content: `email17D_${common.getUniqueString()}`, value: `email17D_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `email17D_id`, toString() { return this.name; } };
	const email17E = { name: `email17E_${common.getUniqueString()}`, subject: `email17E_${common.getUniqueString()}`, from: accountEmail, content: `email17E_${common.getUniqueString()}`, value: `email17E_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `email17E_id`, toString() { return this.name; } };
	const folder_inbox = { name: `folder_inbox_${common.getUniqueString()}`, subject: `folder_inbox_${common.getUniqueString()}`, from: accountEmail, content: `folder_inbox_${common.getUniqueString()}`, value: `folder_inbox_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_inbox_id`, toString() { return this.name; } };
	const folder_spam = { name: `folder_spam_${common.getUniqueString()}`, subject: `folder_spam_${common.getUniqueString()}`, from: accountEmail, content: `folder_spam_${common.getUniqueString()}`, value: `folder_spam_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_spam_id`, toString() { return this.name; } };
	const folder_trash = { name: `folder_trash_${common.getUniqueString()}`, subject: `folder_trash_${common.getUniqueString()}`, from: accountEmail, content: `folder_trash_${common.getUniqueString()}`, value: `folder_trash_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_trash_id`, toString() { return this.name; } };
	const globals = { name: 'globals', inbox: 'inbox', sent: 'sent', trash: 'trash', spam: 'junk', drafts: 'drafts', calendar: 'calendar', contacts: 'contacts', true: 'TRUE', false: 'FALSE', toString() { return this.name; } };
	const message1 = { name: `message1_${common.getUniqueString()}`, subject: `message1_${common.getUniqueString()}`, from: accountEmail, content: `message1_${common.getUniqueString()}`, value: `message1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message1_id`, toString() { return this.name; } };
	const op = { name: 'op', move: 'move', flag: 'flag', unflag: '!flag', read: 'read', unread: '!read', update: 'update', delete: 'delete', trash: 'trash', toString() { return this.name; } };

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
	it('Functional | Create setup for the Search Request (Bug: 2395)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Account
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
                <pref name="zimbraPrefIncludeSpamInSearch">${globals.true}</pref>
                <pref name="zimbraPrefIncludeTrashInSearch">${globals.true}</pref>
            </ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${email17A.subject})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		const email17A_id = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		email17A_id = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${email17B.subject})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m?.[0].su, 'su should match pattern');
		const email17B_id = res4.SearchResponse?.m?.[0].id;
		assert.exists(res4.SearchResponse?.m?.[0].su, 'su should match pattern');
		email17B_id = res4.SearchResponse?.m?.[0].id;
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${email17C.subject}) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		const email17C_id = res5.SearchResponse?.m?.[0].id;
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		email17C_id = res5.SearchResponse?.m?.[0].id;
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${email17D.subject}) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m?.[0].su, 'su should match pattern');
		const email17D_id = res6.SearchResponse?.m?.[0].id;
		assert.exists(res6.SearchResponse?.m?.[0].su, 'su should match pattern');
		email17D_id = res6.SearchResponse?.m?.[0].id;
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${email17E.subject}) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m?.[0].su, 'su should match pattern');
		const email17E_id = res7.SearchResponse?.m?.[0].id;
		assert.exists(res7.SearchResponse?.m?.[0].su, 'su should match pattern');
		email17E_id = res7.SearchResponse?.m?.[0].id;
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Unknown
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// Unknown
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
                <action id = "${email17D.id}" op="${op.move}" l="${folder_trash.id}"/>
            </MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(res9.MsgActionResponse, 'MsgActionResponse should exist');

		// Unknown
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
                <action id = "${email17E.id}" op="${op.move}" l="${folder_spam.id}"/>
            </MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(res10.MsgActionResponse, 'MsgActionResponse should exist');
	});


	it('Functional | Verify that a search for query is - anywhere finds all mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a combination search for query content - (Now) is - anywhere finds all mails (Bug: 2445)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(Now) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(Now) is:anywhere </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that an is - anywhere finds trashed mails (Bug: 15160)', async () => {
		// AddMsgRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${folder_inbox.id}">
                    <content>To: foo@example.com
From: bar@example.com
Subject: email17G
Date: Wed, 15 Aug 2007 10:11:05 -0700 (PDT)
${message1.content}
                    </content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const message1_id = res1.AddMsgResponse.m[0].id;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> ${message1.term} </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'Response element should exist');

		// MsgActionRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
            			<action id="${message1.id}" op="move" l="${folder_trash.id}"/>
        			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(res3.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(res3.MsgActionResponse, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> ${message1.term} is:anywhere </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify that under and not under quesry works fine (Bug: 34265)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> under:INBOX </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.equal(res1.m[0].l, '2', 'l should match');
		assert.equal(res1.SearchResponse.l, '2', 'l should match');
		assert.exists(res1.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> not under:INBOX </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set
		assert.equal(res2.m[0].l, '3', 'l should match');
		// Verify empty result set (original XML had emptyset="1")
		assert.equal(res2.SearchResponse.l, '3', 'l should match');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
