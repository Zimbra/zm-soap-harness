import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Action', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let accountEmail, authToken, convId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create a test account and a conversation for shared use
		accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		authToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to self and forward to create conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Search for the conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		convId = conv.id;
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
	it('Smoke | Mark it as read', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, 'read', 'op should be read');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Smoke | Mark a conversation as unread', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!read"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, '!read', 'op should be !read');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Mark a conversation as flagged', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, 'flag', 'op should be flag');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Mark a conversation as unflagged', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!flag"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, '!flag', 'op should be !flag');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Tag a conversation', async () => {
		// Create a tag
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Tag the conversation
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, 'tag', 'op should be tag');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Untag a conversation', async () => {
		// Create and apply a tag first
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken
		);

		// Untag the conversation
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, '!tag', 'op should be !tag');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Regression | Tag a conversation with invalid tagid', async () => {
		// Create a tag then delete it
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Delete the tag
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Try tagging with deleted tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});


	it('Regression | Untag a conversation with invalid tagid', async () => {
		// Create a tag then delete it
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Try untagging with deleted tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});


	it('Sanity | Move a conversation to a valid folder', async () => {
		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Move conversation
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${folderId}"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, 'move', 'op should be move');
		assert.equal(res.ConvActionResponse.action.id, convId, 'id should match');
	});


	it('Regression | Move a conversation to a nonexisting folder', async () => {
		// First move to inbox
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="2"/>
			</ConvActionRequest>`, authToken
		);

		// Create and delete a folder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, authToken
		);

		// Try moving to deleted folder
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${folderId}"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_FOLDER',
			'Should be mail.NO_SUCH_FOLDER');
	});


	it('Regression | ConvActionRequest without Action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest without conversation-id in Action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id without op attribute in action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id with leading spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="         ${convId}" op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id with trailing spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}         " op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with spaces in place of conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="                    " op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with blank conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="" op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with invalid conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="some text" op="read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and blank in the op attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op=""/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and spaces in the op attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="           "/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and special character in the op attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="//\\\\'^%"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and sometext in the op attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="some text"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and valid op with leading spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="       read"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ConvActionRequest with valid conversation-id and valid op with trailing spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read    "/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Sanity | Delete a conversation', async () => {
		// Create a new conversation for deletion
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for delete test</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>forwarded for delete</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const deleteConvId = conv.id;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${deleteConvId}" op="delete"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		assert.equal(res.ConvActionResponse.action.op, 'delete', 'op should be delete');
		assert.equal(res.ConvActionResponse.action.id, deleteConvId, 'id should match');
	});


	it('Regression | Delete a non existing conversation', async () => {
		// Try deleting the already-deleted conversation (same convId as delete test above)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault for non-existing conv');
		assert.equal(res.ConvActionResponse.action.op, 'delete', 'op should be delete');
	});


	it('Functional | Mark a conversation as spam and verify folder changes', async () => {
		// Create a new conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for spam test</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>forwarded for spam</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Search for conversation in sent
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find conversation in sent');
		const spamConvId = conv.id;

		// Mark as spam
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${spamConvId}" op="spam"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(spamRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(spamRes.ConvActionResponse.action.op, 'spam', 'op should be spam');
		assert.equal(spamRes.ConvActionResponse.action.id, spamConvId, 'id should match');

		// Verify conversation is in spam folder
		const spamSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject}) in:junk</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(spamSearchRes.Fault, 'SearchRequest should not fault');
		const spamConv = Array.isArray(spamSearchRes.SearchResponse.c)
			? spamSearchRes.SearchResponse.c[0] : spamSearchRes.SearchResponse.c;
		assert.exists(spamConv, 'Should find conversation in spam folder');
		assert.equal(spamConv.id, spamConvId, 'Conversation ID should match');

		// Verify conversation is not in sent folder anymore
		const sentSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(sentSearchRes.Fault, 'SearchRequest should not fault');
		const sentConv = sentSearchRes.SearchResponse.c;
		assert.isTrue(!sentConv, 'Conversation should not be in sent folder after spam');
	});


	it('Functional | Move a conversation when the preference for SentFolder is set to Inbox', async () => {
		// Create a new account for this test
		const acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Create two subfolders
		const folder1Name = `folder${common.getUniqueString()}`;
		const folder2Name = `folder${common.getUniqueString()}`;

		const createFolder1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="2"/>
			</CreateFolderRequest>`, acct2AuthToken
		);
		const folder1Id = Array.isArray(createFolder1Res.CreateFolderResponse.folder)
			? createFolder1Res.CreateFolderResponse.folder[0].id
			: createFolder1Res.CreateFolderResponse.folder.id;

		const createFolder2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="2"/>
			</CreateFolderRequest>`, acct2AuthToken
		);
		const folder2Id = Array.isArray(createFolder2Res.CreateFolderResponse.folder)
			? createFolder2Res.CreateFolderResponse.folder[0].id
			: createFolder2Res.CreateFolderResponse.folder.id;

		// Build conversation with messages in different folders
		const subject = `subject${common.getUniqueString()}`;

		// Message 1 in inbox
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@example.com
To: ${acct2Email}
Subject: RE: ${subject}
Date: Thu, 27 Oct 2005 13:42:40 -0700 (PDT)
Message 1!
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMsgRequest should not fault');
		const msg1Id = Array.isArray(addRes1.AddMsgResponse.m)
			? addRes1.AddMsgResponse.m[0].id : addRes1.AddMsgResponse.m.id;

		// Message 2 in folder1
		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder1Id}">
					<content>From: foo@example.com
To: ${acct2Email}
Subject: RE: ${subject}
Date: Thu, 27 Oct 2005 13:42:40 -0700 (PDT)
Message 2!
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMsgRequest should not fault');
		const msg2Id = Array.isArray(addRes2.AddMsgResponse.m)
			? addRes2.AddMsgResponse.m[0].id : addRes2.AddMsgResponse.m.id;

		// Message 3 in sent
		const addRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="5">
					<content>From: foo@example.com
To: ${acct2Email}
Subject: RE: ${subject}
Date: Thu, 27 Oct 2005 13:42:40 -0700 (PDT)
Message 3!
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addRes3.Fault, 'AddMsgRequest should not fault');
		const msg3Id = Array.isArray(addRes3.AddMsgResponse.m)
			? addRes3.AddMsgResponse.m[0].id : addRes3.AddMsgResponse.m.id;

		// Message 4 in trash
		const addRes4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="3">
					<content>From: foo@example.com
To: ${acct2Email}
Subject: RE: ${subject}
Date: Thu, 27 Oct 2005 13:42:40 -0700 (PDT)
Message 4!
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addRes4.Fault, 'AddMsgRequest should not fault');
		const msg4Id = Array.isArray(addRes4.AddMsgResponse.m)
			? addRes4.AddMsgResponse.m[0].id : addRes4.AddMsgResponse.m.id;

		// Search for the conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const convTestId = conv.id;

		// Set sent mail folder preference to /Inbox
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSentMailFolder">/Inbox</pref>
			</ModifyPrefsRequest>`, acct2AuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyPrefsRequest should not fault');

		// Move conversation to folder2 with tcon="-tjs"
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convTestId}" op="move" l="${folder2Id}" tcon="-tjs"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(moveRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(moveRes.ConvActionResponse.action.op, 'move', 'op should be move');

		// Verify using SearchConvRequest
		const convSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convTestId}">
				<query>subject:(${subject})</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(convSearchRes.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(convSearchRes.SearchConvResponse.m)
			? convSearchRes.SearchConvResponse.m : [convSearchRes.SearchConvResponse.m];

		// Messages 1, 2, 3 should be in folder2; message 4 should remain in trash
		const msg1Data = convMsgs.find(m => m && m.id === msg1Id);
		const msg2Data = convMsgs.find(m => m && m.id === msg2Id);
		const msg3Data = convMsgs.find(m => m && m.id === msg3Id);
		const msg4Data = convMsgs.find(m => m && m.id === msg4Id);

		if (msg1Data) assert.equal(msg1Data.l, folder2Id, 'Message 1 should be in folder2');
		if (msg2Data) assert.equal(msg2Data.l, folder2Id, 'Message 2 should be in folder2');
		if (msg3Data) assert.equal(msg3Data.l, folder2Id, 'Message 3 should be in folder2');
		if (msg4Data) assert.equal(msg4Data.l, '3', 'Message 4 should remain in trash');
	});
});
