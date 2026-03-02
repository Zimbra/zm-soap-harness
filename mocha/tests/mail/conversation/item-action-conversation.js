import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Item Action Conversation', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let accountEmail, authToken, convId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create a test account and a conversation for shared use
		accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		authToken = await soap.getAccountAuthToken(accountEmail);

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
	it('Smoke | Mark an item (conversation) as read', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, 'read', 'op should be read');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');

		// Perform item action
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'ItemActionRequest should not fault for already read item');
		assert.equal(res2.ItemActionResponse.action.op, 'read', 'op should be read');
	});


	it('Smoke | Mark an item (conversation) as unread', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!read"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, '!read', 'op should be !read');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Mark an item (conversation) as flagged', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, 'flag', 'op should be flag');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Mark an item (conversation) as unflagged', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!flag"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, '!flag', 'op should be !flag');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Tag an item (conversation)', async () => {
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, 'tag', 'op should be tag');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Sanity | Untag an item (conversation)', async () => {
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Perform item action
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, '!tag', 'op should be !tag');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Regression | Tag an item(conversation) with deleted tag-id', async () => {
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Send tag action request
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});


	it('Regression | Untag an item(conversation) with deleted tag-id', async () => {
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Send tag action request
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});


	it('Sanity | Move an item(conversation) to a valid folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${folderId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, 'move', 'op should be move');
		assert.equal(res.ItemActionResponse.action.id, convId, 'id should match');
	});


	it('Regression | Move an item(conversation) to a nonexisting folder', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="2"/>
			</ItemActionRequest>`, authToken
		);

		const folderName = `folder${common.getUniqueString()}`;

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, authToken
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${folderId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_FOLDER',
			'Should be mail.NO_SUCH_FOLDER');
	});


	it('Regression | ItemActionRequest without Action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest without conversation-id in Action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with valid conversation-id without op attribute in action tag', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with valid conversation-id with leading, trailing, only spaces', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="         ${convId}" op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res1.Fault, 'Should return a Fault for leading spaces');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}         " op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res2.Fault, 'Should return a Fault for trailing spaces');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="                    " op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res3.Fault, 'Should return a Fault for only spaces');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with invalid conversation-id ie id blank, sometext', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="" op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res1.Fault, 'Should return a Fault for blank id');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="some text" op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res2.Fault, 'Should return a Fault for sometext id');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with valid conversation-id and invalid op attribute ie op blank, space, sometext, special character', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op=""/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res1.Fault, 'Should return a Fault for blank op');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="           "/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res2.Fault, 'Should return a Fault for space op');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="some text"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res3.Fault, 'Should return a Fault for sometext op');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="//\\\\'^%"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res4.Fault, 'Should return a Fault for spchar op');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with valid conversation-id and valid op with leading, trailing spaces', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="       read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res1.Fault, 'Should return a Fault for leading spaces in op');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Perform item action
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read    "/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify response
		assert.exists(res2.Fault, 'Should return a Fault for trailing spaces in op');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Sanity | Delete an item(conversation)', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send the message
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

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const deleteConvId = conv.id;

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${deleteConvId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.equal(res.ItemActionResponse.action.op, 'delete', 'op should be delete');
		assert.equal(res.ItemActionResponse.action.id, deleteConvId, 'id should match');
	});


	it('Regression | Delete a non existing conversation', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault for non-existing conv');
		assert.exists(res.ItemActionResponse.action, 'action should exist');
	});
});
