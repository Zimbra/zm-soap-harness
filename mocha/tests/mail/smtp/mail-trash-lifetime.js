import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > SMTP > Mail Trash Lifetime', function () {
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
	it('Sanity | Verify that the mail moved to Trash gets deleted after time specified in zimbraMailTrashLifetime', async () => {
		// Create account with short trash lifetime
		const accountEmail = `trashlifetime${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">5s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify account created
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0].id
			: createRes.CreateAccountResponse.account.id;
		const host = accountId.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Login to the account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		const trashFolder = folders.find(f => f.name === 'Trash');
		const inboxId = inboxFolder.id;
		const trashId = trashFolder.id;

		// Add a message to inbox
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify message added
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const messageId = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0].id : addRes.AddMsgResponse.m.id;

		// Move the message to trash
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify move succeeded
		assert.notExists(moveRes.Fault, 'MsgActionRequest should not fault');

		// Verify message is in trash
		const searchTrash1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Trash</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchTrash1.Fault, 'SearchRequest should not fault');

		// Wait for trash lifetime to expire
		await new Promise(resolve => setTimeout(resolve, 30000));

		// Get mailbox id and purge messages
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

		// Verify trash is now empty
		const searchTrash2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Trash</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify no messages remain in trash
		assert.notExists(searchTrash2.Fault, 'SearchRequest should not fault');
		assert.notExists(searchTrash2.SearchResponse.m,
			'Trash should be empty after purge');
	});


	it('Sanity | Verify that the mail moved to Trash is not deleted untill the accounts zimbraMailTrashLifetime expires', async () => {
		// Create account with default (long) trash lifetime
		const accountEmail = `trashlifetime${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify account created
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0].id
			: createRes.CreateAccountResponse.account.id;
		const host = accountId.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Login to the account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		const trashFolder = folders.find(f => f.name === 'Trash');
		const inboxId = inboxFolder.id;
		const trashId = trashFolder.id;

		// Add a message to inbox
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify message added
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const messageId = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0].id : addRes.AddMsgResponse.m.id;

		// Move the message to trash
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify move succeeded
		assert.notExists(moveRes.Fault, 'MsgActionRequest should not fault');

		// Verify message is in trash
		const searchTrash1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Trash</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchTrash1.Fault, 'SearchRequest should not fault');

		// Get mailbox id and purge messages
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbxId = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0].mbxid
			: mboxRes.GetMailboxResponse.mbox.mbxid;

		// Purge messages (should not delete since lifetime has not expired)
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);

		// Verify purge response
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');

		// Verify message still exists in trash
		const searchTrash2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Trash</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify messages remain in trash
		assert.notExists(searchTrash2.Fault, 'SearchRequest should not fault');
		assert.exists(searchTrash2.SearchResponse.m, 'Message should still be in trash');
	});
});
