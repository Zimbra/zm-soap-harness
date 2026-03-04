import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > SMTP > Mail Spam Lifetime', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Verify that the SPAM mail injected using SMTP gets purged after time specified in zimbraMailSpamLifetime', async () => {
		// Create account with short spam lifetime
		const accountEmail = `spamlifetime${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailSpamLifetime">30s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify account created
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0].id
			: createRes.CreateAccountResponse.account.id;
		const host = accountId.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Inject a spam message via AddMsgRequest into junk folder (l=4)
		const senderEmail = `spam${common.getUniqueString()}@example.com`;
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="4">
					<content>From: ${senderEmail}
To: ${accountEmail}
Subject: spam message
X-Spam-Flag: YES
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
This is a spam message
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Verify message is in junk folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:junk</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify message is in junk folder
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Wait for spam lifetime to expire and purge
		await new Promise(resolve => setTimeout(resolve, 60000));

		// Get mailbox id for purge
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbxId = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0].mbxid
			: mboxRes.GetMailboxResponse.mbox.mbxid;

		// Purge messages
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);

		// Verify purge succeeded
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');

		// Verify junk is now empty
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:(sent OR drafts OR junk OR trash)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify no messages remain
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		assert.notExists(search2Res.SearchResponse.m,
			'No messages should remain after purge');
	});
});
