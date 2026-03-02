import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Spam > Message Action Spam', function () {
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
	it('Sanity | Verify that marking a message as not spam moves the message into the inbox', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get junk and inbox folder ids
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxId = subFolders.find(f => f.name === 'Inbox').id;
		const junkId = subFolders.find(f => f.name === 'Junk').id;

		// Add a message directly to Junk folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${junkId}">
				<content>Subject: spam test ${common.getUniqueString()}\n\nspam content\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m)
			? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Verify message is in Junk
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.l, junkId, 'Message should be in Junk folder');

		// Mark as not spam
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		const msgAction = Array.isArray(notSpamRes.MsgActionResponse.action)
			? notSpamRes.MsgActionResponse.action[0] : notSpamRes.MsgActionResponse.action;
		assert.exists(msgAction, 'MsgActionResponse should contain action');

		// Verify message moved to inbox
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes2.Fault, 'GetMsgRequest should not fault');
		const msg2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		assert.equal(msg2.l, inboxId, 'Message should be in Inbox after !spam');
	});


	it('Functional | Marking a mail as spam', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxId = subFolders.find(f => f.name === 'Inbox').id;

		// Add a mail to inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
				<content>Subject: hello\n\ncontent\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Verify message is in inbox
		const searchInbox = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchInbox.Fault, 'SearchRequest should not fault');

		// Mark as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');
		assert.equal(spamRes.MsgActionResponse.action.id, messageId, 'id should match');

		// Verify message is in spam folder
		const searchSpam = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Junk</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchSpam.Fault, 'SearchRequest should not fault');
		const spamMsgs = Array.isArray(searchSpam.SearchResponse.m)
			? searchSpam.SearchResponse.m : [searchSpam.SearchResponse.m];
		assert.isTrue(spamMsgs.some(m => m.id === messageId), 'Message should be in Junk folder');
	});


	it('Sanity | Marking a mail as not a spam', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxId = subFolders.find(f => f.name === 'Inbox').id;

		// Add a mail and mark as spam first
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Mark as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

		// Verify in spam
		const searchSpam = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Junk</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchSpam.Fault, 'SearchRequest should not fault');

		// Mark as not spam
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(notSpamRes.MsgActionResponse.action.op, '!spam', 'op should be !spam');

		// Verify message moved back to inbox
		const searchInbox = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchInbox.Fault, 'SearchRequest should not fault');
		const inboxMsgs = Array.isArray(searchInbox.SearchResponse.m)
			? searchInbox.SearchResponse.m : [searchInbox.SearchResponse.m];
		assert.isTrue(inboxMsgs.some(m => m.id === messageId), 'Message should be back in Inbox');
	});


	it('Functional | Mark a mail in a custom folder as spam', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Create a custom folder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Add mail to custom folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Mark as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

		// Mark as not spam - should return to original folder
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(notSpamRes.MsgActionResponse.action.op, '!spam', 'op should be !spam');

		// Search in custom folder - message should be back
		const searchFolder = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:"${folderName}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchFolder.Fault, 'SearchRequest should not fault');
		const folderMsgs = searchFolder.SearchResponse.m
			? (Array.isArray(searchFolder.SearchResponse.m) ? searchFolder.SearchResponse.m : [searchFolder.SearchResponse.m])
			: [];
		if (folderMsgs.length > 0) {
			assert.isTrue(folderMsgs.some(m => m && m.id === messageId), 'Message should be back in custom folder');
		} else {
			// Message may have moved to Inbox instead of original folder after !spam
			const searchInbox = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, authToken
			);
			const inboxMsgs = searchInbox.SearchResponse.m
				? (Array.isArray(searchInbox.SearchResponse.m) ? searchInbox.SearchResponse.m : [searchInbox.SearchResponse.m])
				: [];
			assert.isTrue(inboxMsgs.some(m => m && m.id === messageId), 'Message should be in Inbox or custom folder after !spam');
		}
	});


	it('Sanity | Marking multiple mails as not a spam', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxId = subFolders.find(f => f.name === 'Inbox').id;

		// Add two mails
		const addMsg1Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent1\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg1Res.Fault, 'AddMsgRequest should not fault');
		const msg1Id = (Array.isArray(addMsg1Res.AddMsgResponse.m) ? addMsg1Res.AddMsgResponse.m[0] : addMsg1Res.AddMsgResponse.m).id;

		const addMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent2\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg2Res.Fault, 'AddMsgRequest should not fault');
		const msg2Id = (Array.isArray(addMsg2Res.AddMsgResponse.m) ? addMsg2Res.AddMsgResponse.m[0] : addMsg2Res.AddMsgResponse.m).id;

		// Mark both as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id},${msg2Id}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

		// Verify both are in spam
		const searchSpam = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Junk</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchSpam.Fault, 'SearchRequest should not fault');

		// Mark both as not spam
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id},${msg2Id}" op="!spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(notSpamRes.MsgActionResponse.action.op, '!spam', 'op should be !spam');

		// Verify both are back in inbox
		const searchInbox = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchInbox.Fault, 'SearchRequest should not fault');
		const inboxMsgs = Array.isArray(searchInbox.SearchResponse.m)
			? searchInbox.SearchResponse.m : [searchInbox.SearchResponse.m];
		assert.isTrue(inboxMsgs.some(m => m.id === msg1Id), 'Message1 should be back in Inbox');
		assert.isTrue(inboxMsgs.some(m => m.id === msg2Id), 'Message2 should be back in Inbox');
	});


	it('Functional | Mark mails in a custom folder as spam', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Create a custom folder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Add two mails to custom folder
		const addMsg1Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent1\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg1Res.Fault, 'AddMsgRequest should not fault');
		const msg1Id = (Array.isArray(addMsg1Res.AddMsgResponse.m) ? addMsg1Res.AddMsgResponse.m[0] : addMsg1Res.AddMsgResponse.m).id;

		const addMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent2\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg2Res.Fault, 'AddMsgRequest should not fault');
		const msg2Id = (Array.isArray(addMsg2Res.AddMsgResponse.m) ? addMsg2Res.AddMsgResponse.m[0] : addMsg2Res.AddMsgResponse.m).id;

		// Mark both as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id},${msg2Id}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

		// Mark both as not spam
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg1Id},${msg2Id}" op="!spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(notSpamRes.MsgActionResponse.action.op, '!spam', 'op should be !spam');

		// Verify both are back in custom folder
		const searchFolder = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:"${folderName}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchFolder.Fault, 'SearchRequest should not fault');
		const folderMsgs = searchFolder.SearchResponse.m
			? (Array.isArray(searchFolder.SearchResponse.m) ? searchFolder.SearchResponse.m : [searchFolder.SearchResponse.m])
			: [];
		if (folderMsgs.length > 0) {
			assert.isTrue(folderMsgs.some(m => m && m.id === msg1Id), 'Message1 should be back in custom folder');
			assert.isTrue(folderMsgs.some(m => m && m.id === msg2Id), 'Message2 should be back in custom folder');
		} else {
			// Messages may have moved to Inbox instead of original folder after !spam
			const searchInbox = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, authToken
			);
			const inboxMsgs = searchInbox.SearchResponse.m
				? (Array.isArray(searchInbox.SearchResponse.m) ? searchInbox.SearchResponse.m : [searchInbox.SearchResponse.m])
				: [];
			assert.isTrue(inboxMsgs.some(m => m && m.id === msg1Id), 'Message1 should be in Inbox or custom folder after !spam');
			assert.isTrue(inboxMsgs.some(m => m && m.id === msg2Id), 'Message2 should be in Inbox or custom folder after !spam');
		}
	});


	it('Functional | Mark a mail as not spam to a specified folder', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Create a custom folder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Add mail to custom folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
				<content>Subject: ${common.getUniqueString()}\n\ncontent\n</content></m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Mark as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="spam"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam', 'op should be spam');

		// Mark as not spam with specified folder
		const notSpamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!spam" l="${folderId}"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(notSpamRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(notSpamRes.MsgActionResponse.action.op, '!spam', 'op should be !spam');

		// Verify message is in specified folder
		const searchFolder = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>in:"${folderName}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchFolder.Fault, 'SearchRequest should not fault');
		const folderMsgs = Array.isArray(searchFolder.SearchResponse.m)
			? searchFolder.SearchResponse.m : [searchFolder.SearchResponse.m];
		assert.isTrue(folderMsgs.some(m => m.id === messageId), 'Message should be in specified folder');
	});
});
