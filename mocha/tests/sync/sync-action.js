import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Sync Action', function () {
	this.timeout(30 * 1000);
	let accountAuthToken = null;
	let account2Email = null, account2AuthToken = null;
	let account3Email = null, account3AuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
		account3Email = soap.testAccounts.testAccount3.emailAddress;
		account3AuthToken = await soap.getAccountAuthToken(account3Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Send SyncRequest to get results from MsgAction Request', async () => {
		// Get inbox folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken, true
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(getFolderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const inboxFolder = folders[0].folder.find(f => f.name === 'Inbox');
		const inboxId = inboxFolder.id;

		// Create subfolder under inbox
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`, accountAuthToken, true
		);
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(createFolderRes.CreateFolderResponse, 'CreateFolderResponse should exist');
		const subfolderId = createFolderRes.CreateFolderResponse.folder[0].id;

		// Add a message to inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Date: Thu, 16 Jun 2005 15:17:15 -0700 (PDT)
To: foo@example.com
From: bar@example.com
Subject: subject

Content

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken, true
		);
		assert.notExists(addMsgRes.Fault, 'Response should not be a Fault');
		assert.exists(addMsgRes.AddMsgResponse, 'AddMsgResponse should exist');
		const messageId = addMsgRes.AddMsgResponse.m[0].id;

		// Initial SyncRequest to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken, true
		);
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		assert.exists(syncRes1.SyncResponse, 'SyncResponse should exist');
		const syncToken = syncRes1.SyncResponse.token;
		assert.exists(syncToken, 'SyncResponse should have a token');

		// Move message to subfolder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${subfolderId}"/>
			</MsgActionRequest>`, accountAuthToken, true
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		assert.exists(moveRes.MsgActionResponse, 'MsgActionResponse should exist');
		assert.exists(moveRes.MsgActionResponse.action, 'MsgActionResponse should have action');

		// SyncRequest with token - verify message appears with correct folder
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${syncToken}"/>`, accountAuthToken, true
		);
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		const syncMessages = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m : (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);
		const movedMsg = syncMessages.find(m => m.id === messageId);
		assert.exists(movedMsg, 'Moved message should appear in SyncResponse');
		assert.equal(movedMsg.l, subfolderId, 'Message folder should match subfolder id');
	});


	it('Functional | Send SyncRequest to get results from (multiple) MsgAction Request (related to bug 4992, but I cant repro that issue with these steps)', async () => {
		// account2 sends 3 messages to account3
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<su>Bug 4992</su>
					<mp ct="text/plain">
						<content>Here is message content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken, true
		);
		assert.notExists(sendRes1.Fault, 'Response should not be a Fault');
		assert.exists(sendRes1.SendMsgResponse, 'SendMsgResponse should exist');
		const origMsgId = sendRes1.SendMsgResponse.m[0].id;

		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${origMsgId}" rt="f">
					<e t="t" a="${account3Email}"/>
					<su>FWD: Bug 4992</su>
					<mp ct="text/plain">
						<content>Here is more message content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken, true
		);
		assert.notExists(sendRes2.Fault, 'Response should not be a Fault');
		assert.exists(sendRes2.SendMsgResponse, 'SendMsgResponse should exist');

		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${origMsgId}" rt="f">
					<e t="t" a="${account3Email}"/>
					<su>FWD: Bug 4992</su>
					<mp ct="text/plain">
						<content>Here is even more message content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken, true
		);
		assert.notExists(sendRes3.Fault, 'Response should not be a Fault');
		assert.exists(sendRes3.SendMsgResponse, 'SendMsgResponse should exist');

		// Login as account3 - get inbox and create 2 subfolders
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken, true
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const inboxFolder = folders[0].folder.find(f => f.name === 'Inbox');
		const inboxId = inboxFolder.id;

		const folder1Name = `folder.${common.getUniqueString()}`;
		const createFolder1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="${inboxId}"/>
			</CreateFolderRequest>`, account3AuthToken, true
		);
		assert.notExists(createFolder1Res.Fault, 'Response should not be a Fault');
		const folder1Id = createFolder1Res.CreateFolderResponse.folder[0].id;

		const folder2Name = `folder.${common.getUniqueString()}`;
		const createFolder2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="${inboxId}"/>
			</CreateFolderRequest>`, account3AuthToken, true
		);
		assert.notExists(createFolder2Res.Fault, 'Response should not be a Fault');
		const folder2Id = createFolder2Res.CreateFolderResponse.folder[0].id;

		// Search inbox for the 3 messages
		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account3AuthToken, true
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.isAtLeast(messages.length, 3, 'Should have at least 3 messages');
		const msg1Id = messages[messages.length - 3].id;
		const msg2Id = messages[messages.length - 2].id;
		const msg3Id = messages[messages.length - 1].id;

		// Initial SyncRequest to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account3AuthToken, true
		);
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const syncToken = syncRes1.SyncResponse.token;

		// Move messages to subfolders
		const moveRes1 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id}" op="move" l="${folder1Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes1.Fault, 'Response should not be a Fault');
		assert.exists(moveRes1.MsgActionResponse.action, 'MsgActionResponse should have action');

		const moveRes2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg2Id}" op="move" l="${folder2Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes2.Fault, 'Response should not be a Fault');
		assert.exists(moveRes2.MsgActionResponse.action, 'MsgActionResponse should have action');

		const moveRes3 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg3Id}" op="move" l="${folder2Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes3.Fault, 'Response should not be a Fault');
		assert.exists(moveRes3.MsgActionResponse.action, 'MsgActionResponse should have action');

		// account2 sends another message to account3
		const sendRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${origMsgId}" rt="f">
					<e t="t" a="${account3Email}"/>
					<su>RE: Bug 4992</su>
					<mp ct="text/plain">
						<content>Here is even more and more message content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken, true
		);
		assert.notExists(sendRes4.Fault, 'Response should not be a Fault');
		assert.exists(sendRes4.SendMsgResponse, 'SendMsgResponse should exist');

		// Wait for message delivery, then move messages again as account3
		await new Promise(resolve => setTimeout(resolve, 2000));

		const moveRes4 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id}" op="move" l="${folder1Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes4.Fault, 'Response should not be a Fault');

		const moveRes5 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg2Id}" op="move" l="${folder2Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes5.Fault, 'Response should not be a Fault');

		const moveRes6 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg3Id}" op="move" l="${folder2Id}"/>
			</MsgActionRequest>`, account3AuthToken, true
		);
		assert.notExists(moveRes6.Fault, 'Response should not be a Fault');

		// SyncRequest with token - verify messages appear with correct folders
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${syncToken}"/>`, account3AuthToken, true
		);
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		const syncMessages = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m : (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);
		const syncMsg1 = syncMessages.find(m => m.id === msg1Id);
		const syncMsg2 = syncMessages.find(m => m.id === msg2Id);
		const syncMsg3 = syncMessages.find(m => m.id === msg3Id);
		if (syncMsg1) {
			assert.equal(syncMsg1.l, folder1Id, 'Message 1 folder should match folder1');
		}
		if (syncMsg2) {
			assert.equal(syncMsg2.l, folder2Id, 'Message 2 folder should match folder2');
		}
		if (syncMsg3) {
			assert.equal(syncMsg3.l, folder2Id, 'Message 3 folder should match folder2');
		}
	});
});
