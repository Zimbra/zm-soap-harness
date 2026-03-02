import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug 62687', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const junkSubject = `junkmail_${common.getUniqueString()}`;

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

		// Inject message directly into junk folder (folder id=4)
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="4">
					<content>From: spammer@spam.com
To: ${accountEmail}
Subject: ${junkSubject}
MIME-Version: 1.0
This is a junk message for testing</content>
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
	it('Sanity | Verify that moved junk mail to inbox is search-able when zimbraJunkMessagesIndexingEnabled is set to FALSE (Bug: 62687)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Search in junk
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:junk</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');
		const messageId = res1.SearchResponse?.m?.[0]?.id;

		// Move to inbox (folder id=2)
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="2"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const msgAction = Array.isArray(res2.MsgActionResponse.action)
			? res2.MsgActionResponse.action[0] : res2.MsgActionResponse.action;
		assert.exists(msgAction, 'MsgActionResponse should contain action');

		// Search for the junk message subject - should now be findable
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${junkSubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');
	});
});
