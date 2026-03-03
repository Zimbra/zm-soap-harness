import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sync > Mountpoint > Syncrequest Mail', function () {
	this.timeout(60 * 1000);
	let adminAuthToken = null;
	let account1Email = null, account1AuthToken = null, account1Id = null;
	let account2Email = null, account2AuthToken = null;
	let account3Email = null, account3AuthToken = null;
	let inboxFolderId = null;

	before(async () => {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		account1Email = account1Name;
		account1Id = createRes1.CreateAccountResponse.account[0].id;
		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		account2Email = account2Name;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create account3 (message sender)
		const account3Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		account3Email = account3Name;
		account3AuthToken = await soap.getAccountAuthToken(account3Email);

		// Get account1 inbox folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const inboxFolder = folders[0].folder.find(f => f.name === 'Inbox');
		inboxFolderId = inboxFolder.id;

		// Grant read access on inbox to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${inboxFolderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
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
	it('Sanity | Verify that a new message in a shared folder is listed in the SyncResponse', async () => {
		// Sync as account2 on shared inbox to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Send message to account1 from account3
		const subject = `subject.${common.getUniqueString()}`;

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Wait for delivery and sync as account2
		await new Promise(resolve => setTimeout(resolve, 2000));

		// SyncRequest
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncMsgs = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m
			: (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);

		// Verify response
		assert.isAbove(syncMsgs.length, 0, 'New message should appear in SyncResponse');
	});


	it('Functional | Verify that a deleted message in a shared folder is listed in the SyncResponse', async () => {
		// Send message to account1
		const subject = `subject.${common.getUniqueString()}`;

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content for delete</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		// Wait for delivery and find the message
		await new Promise(resolve => setTimeout(resolve, 2000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Delete message as account1
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${msgId}"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		// Wait for server to process deletion
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Sync as account2 - verify deleted
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse.deleted,
			'SyncResponse should have deleted element');
		const delObj = syncRes2.SyncResponse.deleted;
		const deletedIds = String(delObj.ids || delObj.id || delObj || '');

		// Verify response
		assert.isNotEmpty(deletedIds,
			'SyncResponse should have deleted ids');
	});


	it('Functional | Verify that a new message (moved) in a shared folder is listed in the SyncResponse', async () => {
		// Get trash folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		const trashId = trashFolder.id;

		// Add message directly to trash
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${trashId}">
					<content>Date: Thu, 16 Jun 2005 15:17:15 -0700
From: foo@example.com
To: ${account1Email}
Subject: move-test-${common.getUniqueString()}

Content for move test</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Move message to inbox
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${inboxFolderId}"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify moved message appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncMsgs = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m
			: (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);
		const matchMsg = syncMsgs.find(m => m.id === `${account1Id}:${msgId}`);

		// Verify response
		assert.exists(matchMsg, 'Moved message should appear in SyncResponse');
	});


	it('Functional | Verify that a marked read message in a shared folder is listed in the SyncResponse', async () => {
		// Send message to account1
		const subject = `subject.${common.getUniqueString()}`;

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content for read</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		// Wait and find the message
		await new Promise(resolve => setTimeout(resolve, 2000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Mark message as read
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${msgId}"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(readRes.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify marked read message appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${inboxFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncMsgs = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m
			: (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);
		const matchMsg = syncMsgs.find(m => m.id === `${account1Id}:${msgId}`);

		// Verify response
		assert.exists(matchMsg, 'Marked-read message should appear in SyncResponse');
	});
});
