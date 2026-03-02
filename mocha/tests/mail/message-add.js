import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Add', function () {
	this.timeout(60 * 1000);
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

	/**
	 * Helper: Create test account and return auth token and email
	 */
	async function setupAccount() {
		const accountEmail = 'test' + common.getUniqueString() + '@' + testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			'<CreateAccountRequest xmlns="urn:zimbraAdmin">' +
			'<name>' + accountEmail + '</name>' +
			'<password>' + config.accountPassword + '</password>' +
			'</CreateAccountRequest>', adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		return { accountEmail, authToken };
	}

	/**
	 * Helper: Build MIME content for AddMsgRequest
	 */
	function buildMimeContent(toEmail, subject, body) {
		return 'To: ' + toEmail + '\n' +
			'From: sender@example.com\n' +
			'Subject: ' + subject + '\n' +
			'Date: Fri, 28 Dec 2007 09:38:56 -0800\n' +
			'\n' +
			'\n' +
			body + '\n';
	}

	/**
	 * Helper: Extract message from AddMsgResponse (handles array or object)
	 */
	function getMsg(addMsgResponse) {
		const m = addMsgResponse.m;
		return Array.isArray(m) ? m[0] : m;
	}

	// Tests
	it('Smoke | Adding a message to default folders', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const inboxFolderId = '2';
		const trashFolderId = '3';
		const spamFolderId = '4';
		const sentFolderId = '5';
		const draftsFolderId = '6';

		// Add a mail to the inbox
		const addInboxRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addInboxRes.Fault, 'AddMsgRequest should not fault');
		const message1Id = getMsg(addInboxRes.AddMsgResponse).id;

		// Search the mail in inbox
		const searchInboxRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:inbox</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchInboxRes.Fault, 'SearchRequest should not fault');
		const msgs1 = Array.isArray(searchInboxRes.SearchResponse.m)
			? searchInboxRes.SearchResponse.m : [searchInboxRes.SearchResponse.m];
		const foundMsg1 = msgs1.find(m => m && m.id === message1Id);
		assert.exists(foundMsg1, 'Should find the added message in Inbox');

		// Add a mail to the Drafts
		const addDraftsRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + draftsFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addDraftsRes.Fault, 'AddMsgRequest should not fault');
		const message2Id = getMsg(addDraftsRes.AddMsgResponse).id;

		// Search the mail in drafts
		const searchDraftsRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:drafts</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchDraftsRes.Fault, 'SearchRequest should not fault');
		const msgs2 = Array.isArray(searchDraftsRes.SearchResponse.m)
			? searchDraftsRes.SearchResponse.m : [searchDraftsRes.SearchResponse.m];
		const foundMsg2 = msgs2.find(m => m && m.id === message2Id);
		assert.exists(foundMsg2, 'Should find the added message in Drafts');

		// Add a mail to the sent folder
		const addSentRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + sentFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addSentRes.Fault, 'AddMsgRequest should not fault');
		const message3Id = getMsg(addSentRes.AddMsgResponse).id;

		// Search the mail in sent folder
		const searchSentRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:sent</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchSentRes.Fault, 'SearchRequest should not fault');
		const msgs3 = Array.isArray(searchSentRes.SearchResponse.m)
			? searchSentRes.SearchResponse.m : [searchSentRes.SearchResponse.m];
		const foundMsg3 = msgs3.find(m => m && m.id === message3Id);
		assert.exists(foundMsg3, 'Should find the added message in Sent');

		// Add a mail to the spam folder
		const addSpamRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + spamFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addSpamRes.Fault, 'AddMsgRequest should not fault');
		const message4Id = getMsg(addSpamRes.AddMsgResponse).id;

		// Search the mail in spam folder
		const searchSpamRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:junk</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchSpamRes.Fault, 'SearchRequest should not fault');
		const msgs4 = Array.isArray(searchSpamRes.SearchResponse.m)
			? searchSpamRes.SearchResponse.m : [searchSpamRes.SearchResponse.m];
		const foundMsg4 = msgs4.find(m => m && m.id === message4Id);
		assert.exists(foundMsg4, 'Should find the added message in Junk');

		// Add a mail to the trash
		const addTrashRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + trashFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addTrashRes.Fault, 'AddMsgRequest should not fault');
		const message5Id = getMsg(addTrashRes.AddMsgResponse).id;

		// Search the mail in trash folder
		const searchTrashRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:trash</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchTrashRes.Fault, 'SearchRequest should not fault');
		const msgs5 = Array.isArray(searchTrashRes.SearchResponse.m)
			? searchTrashRes.SearchResponse.m : [searchTrashRes.SearchResponse.m];
		const foundMsg5 = msgs5.find(m => m && m.id === message5Id);
		assert.exists(foundMsg5, 'Should find the added message in Trash');
	});


	it('Sanity | Adding a message to user defined folder', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const folderName = 'folder' + common.getUniqueString();

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<CreateFolderRequest xmlns="urn:zimbraMail">' +
			'<folder name="' + folderName + '" l="1"/>' +
			'</CreateFolderRequest>', authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder1 = Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		const folderId = folder1.id;

		// Add a mail to the newly created folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + folderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = getMsg(addMsgRes.AddMsgResponse).id;

		// Search the mail in newly created folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>in:"' + folderName + '"</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const foundMsg = msgs.find(m => m && m.id === messageId);
		assert.exists(foundMsg, 'Should find the added message in the user defined folder');
	});


	it('Regression | Adding a message to a non-existing folder', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const invalidFolderId = '98765';

		// Add a mail to the non-existing folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + invalidFolderId + '">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);

		// Verify fault
		assert.exists(addMsgRes.Fault, 'Should return a Fault');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_ITEM', 'Should be mail.NO_SUCH_ITEM');
	});


	it('Regression | Adding a message to a deleted folder', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const folderName = 'folder' + common.getUniqueString();

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<CreateFolderRequest xmlns="urn:zimbraMail">' +
			'<folder name="' + folderName + '" l="1"/>' +
			'</CreateFolderRequest>', authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder1 = Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		const folderId = folder1.id;

		// Delete the folder
		const deleteFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<FolderActionRequest xmlns="urn:zimbraMail">' +
			'<action op="delete" id="' + folderId + '"/>' +
			'</FolderActionRequest>', authToken
		);
		assert.notExists(deleteFolderRes.Fault, 'FolderActionRequest should not fault');

		// Add a mail to the deleted folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + folderId + '">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);

		// Verify fault
		assert.exists(addMsgRes.Fault, 'Should return a Fault');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_ITEM', 'Should be mail.NO_SUCH_ITEM');
	});


	it('Functional | Adding a message in inbox and tag it', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const inboxFolderId = '2';
		const tagName = 'tag' + common.getUniqueString();

		// Create a tag
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			'<CreateTagRequest xmlns="urn:zimbraMail">' +
			'<tag name="' + tagName + '" color="4"/>' +
			'</CreateTagRequest>', authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tag1 = Array.isArray(createTagRes.CreateTagResponse.tag) ? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tag1.id;

		// Tag a mail and add in the inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m t="' + tagId + '" l="' + inboxFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);

		// Verify response
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		assert.exists(getMsg(addMsgRes.AddMsgResponse), 'AddMsgResponse should contain m');
	});


	it('Regression | Adding a message in inbox giving an invalid path of folder', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a mail to an invalid path
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="/*+">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);

		// Verify fault
		assert.exists(addMsgRes.Fault, 'Should return a Fault');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_FOLDER', 'Should be mail.NO_SUCH_FOLDER');
	});


	it('Regression | Test AddMsgRequest without a folder specified - l option', async () => {
		// Create accounts
		const { accountEmail, authToken } = await setupAccount();
		const accountEmail2 = 'test' + common.getUniqueString() + '@' + testDomain;
		const messageSubject = 'subject' + common.getUniqueString();

		// Send AddMsgRequest without a folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m>' +
			'<e t="f" a="' + accountEmail + '"/>' +
			'<e t="t" a="' + accountEmail2 + '"/>' +
			'<su>' + messageSubject + '</su>' +
			'<content>test content</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);

		// Verify fault
		assert.exists(addMsgRes.Fault, 'Should return a Fault');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Functional | Adding a message in inbox and flag it', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const inboxFolderId = '2';

		// Add a message in inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = getMsg(addMsgRes.AddMsgResponse).id;

		// Flag the message
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="flag"/>' +
			'</MsgActionRequest>', authToken
		);

		// Verify response
		assert.notExists(flagRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(flagRes.MsgActionResponse.action.op, 'flag', 'op should be flag');
		assert.equal(flagRes.MsgActionResponse.action.id, messageId, 'id should match message id');
	});


	it('Functional | Unflagged a message added by AddMsgRequest', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const inboxFolderId = '2';

		// Add a message in inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = getMsg(addMsgRes.AddMsgResponse).id;

		// Unflag the message
		const unflagRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="!flag"/>' +
			'</MsgActionRequest>', authToken
		);

		// Verify response
		assert.notExists(unflagRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(unflagRes.MsgActionResponse.action.op, '!flag', 'op should be !flag');
		assert.equal(unflagRes.MsgActionResponse.action.id, messageId, 'id should match message id');
	});


	it('Functional | Mark message added by AddMsgRequest as read, unread', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const mimeContent = buildMimeContent(accountEmail, subject, 'test body content');
		const inboxFolderId = '2';

		// Add a message in inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = getMsg(addMsgRes.AddMsgResponse).id;

		// Mark as read
		const readRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="read"/>' +
			'</MsgActionRequest>', authToken
		);

		// Verify read response
		assert.notExists(readRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(readRes.MsgActionResponse.action.op, 'read', 'op should be read');
		assert.equal(readRes.MsgActionResponse.action.id, messageId, 'id should match message id');

		// Mark as unread
		const unreadRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="!read"/>' +
			'</MsgActionRequest>', authToken
		);

		// Verify unread response
		assert.notExists(unreadRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(unreadRes.MsgActionResponse.action.op, '!read', 'op should be !read');
		assert.equal(unreadRes.MsgActionResponse.action.id, messageId, 'id should match message id');
	});


	it('Functional | AddMsgRequest with attribute d as valid time', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Add a message with valid time
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="1127476800000">' +
			'<content>From: foo@foo.com\n' +
			'To: foo@foo.com\n' +
			'Subject: email01A\n' +
			'MIME-Version: 1.0\n' +
			'Content-Type: text/plain; charset=utf-8\n' +
			'Content-Transfer-Encoding: 7bit\n' +
			'\n' +
			'\n' +
			'simple text string in the body\n' +
			'</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = getMsg(addMsgRes.AddMsgResponse).id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '"/>' +
			'</GetMsgRequest>', authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Search the message by date
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<tz id="(GMT) Greenwich Mean Time - Dublin / Edinburgh / Lisbon / London"/>' +
			'<query>date:9/23/2005</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const foundMsg = msgs.find(m => m && m.id === messageId);
		assert.exists(foundMsg, 'Should find the added message by date in search');
	});


	it('Regression | AddMsgRequest with attribute d as invalid (sonetext, spchar, number, negative, decimal, blank)', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Test with sometext - should fault
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="some text">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res1.Fault, 'Should return a Fault for sometext');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with spchar - should fault
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="//\\\\\'^\%">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res2.Fault, 'Should return a Fault for spchar');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with number - should succeed
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="123">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res3.Fault, 'AddMsgRequest should not fault for number');
		assert.exists(getMsg(res3.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with negative - should succeed
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="-2">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res4.Fault, 'AddMsgRequest should not fault for negative');
		assert.exists(getMsg(res4.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with decimal - should fault
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="2.09">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res5.Fault, 'Should return a Fault for decimal');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with blank - should fault
		const res6 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" d="">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res6.Fault, 'Should return a Fault for blank');
		assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | AddMsgRequest with attribute aid as invalid (sonetext, spchar, number, negative, decimal, blank)', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Test with sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="some text">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res1.Fault, 'Should return a Fault for sometext');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="//\\\\\'^\%">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res2.Fault, 'Should return a Fault for spchar');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="123">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res3.Fault, 'Should return a Fault for number');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="-2">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res4.Fault, 'Should return a Fault for negative');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="2.09">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res5.Fault, 'Should return a Fault for decimal');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with blank
		const res6 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" aid="">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res6.Fault, 'Should return a Fault for blank');
		assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Functional | AddMsgRequest with attribute noICal as valid (TRUE, FALSE)', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Test with TRUE
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="TRUE">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res1.Fault, 'AddMsgRequest should not fault for TRUE');
		assert.exists(getMsg(res1.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with FALSE
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="FALSE">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res2.Fault, 'AddMsgRequest should not fault for FALSE');
		assert.exists(getMsg(res2.AddMsgResponse), 'AddMsgResponse should contain m');
	});


	it('Regression | AddMsgRequest with attribute noICal as invalid (sonetext, spchar, number, negative, decimal, blank)', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Test with sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="some text">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res1.Fault, 'Should return a Fault for sometext');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="//\\\\\'^\%">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res2.Fault, 'Should return a Fault for spchar');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="123">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res3.Fault, 'Should return a Fault for number');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="-2">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res4.Fault, 'Should return a Fault for negative');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="2.09">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res5.Fault, 'Should return a Fault for decimal');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');

		// Test with blank
		const res6 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '" noICal="">' +
			'<content>"test content"</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken, false
		);
		assert.exists(res6.Fault, 'Should return a Fault for blank');
		assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | AddMsgRequest with attribute uid as invalid (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create account
		const { authToken } = await setupAccount();
		const inboxFolderId = '2';

		// Test with sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid="some text"/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res1.Fault, 'AddMsgRequest should not fault for sometext');
		assert.exists(getMsg(res1.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid="//\\\\\'^\%"/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res2.Fault, 'AddMsgRequest should not fault for spchar');
		assert.exists(getMsg(res2.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid="123"/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res3.Fault, 'AddMsgRequest should not fault for number');
		assert.exists(getMsg(res3.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid="-2"/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res4.Fault, 'AddMsgRequest should not fault for negative');
		assert.exists(getMsg(res4.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid="2.09"/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res5.Fault, 'AddMsgRequest should not fault for decimal');
		assert.exists(getMsg(res5.AddMsgResponse), 'AddMsgResponse should contain m');

		// Test with blank
		const res6 = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + inboxFolderId + '">' +
			'<content>"test content"</content>' +
			'<inv uid=""/>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(res6.Fault, 'AddMsgRequest should not fault for blank');
		assert.exists(getMsg(res6.AddMsgResponse), 'AddMsgResponse should contain m');
	});


	it('Regression | AddMsgRequest without m element', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a message without m element
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'</AddMsgRequest>', authToken, false
		);

		// Verify fault
		assert.exists(addMsgRes.Fault, 'Should return a Fault');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});
});
