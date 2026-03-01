import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug62687', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const folder = { name: `folder_${common.getUniqueString()}`, subject: `folder_${common.getUniqueString()}`, from: accountEmail, content: `folder_${common.getUniqueString()}`, value: `folder_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_id`, inbox: '2', trash: '3', spam: '4', sent: '5', drafts: '6', toString() { return this.name; } };
	const junkmail = { name: `junkmail_${common.getUniqueString()}`, subject: `junkmail_${common.getUniqueString()}`, from: accountEmail, content: `junkmail_${common.getUniqueString()}`, value: `junkmail_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `junkmail_id`, toString() { return this.name; } };
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
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
	it('Sanity | Verify that moved junk mail to inbox is search-able when zimbraJunkMessagesIndexingEnabled is set to FALSE (Bug: 62687)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${junkmail.subject1})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:junk</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		const message_id = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m?.[0].su, 'su should match pattern');
		message_id = res3.SearchResponse?.m?.[0].id;
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// Unknown
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns = "urn:zimbraMail">
                <action id = "${message.id}" op = "${op.move}" l = "${folder.inbox}"/>
            </MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(res4.MsgActionResponse, 'MsgActionResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${junkmail.subject1})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		assert.exists(res5.SearchResponse?.m?.[0].su, 'su should match pattern');
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');
	});
});
