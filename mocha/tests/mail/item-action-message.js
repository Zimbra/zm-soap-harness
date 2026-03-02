import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Item Action Message', function () {
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
	 * Helper: create account and add a message directly to its inbox
	 * Returns { authToken, messageId, accountEmail }
	 */
	async function setupAccountWithMessage() {
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const subject = `Subject${common.getUniqueString()}`;
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: ${accountEmail}
From: sender@example.com
Subject: ${subject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of the message
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addRes.AddMsgResponse.m) ? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m).id;
		return { authToken, messageId, accountEmail, subject };
	}

	// Tests
	it('Smoke | Mark an item (message) as read', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark as read
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'read', 'op should be read');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark an item (message) as unread', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark as read first, then unread
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read"/>
			</ItemActionRequest>`, authToken
		);

		// Mark as unread
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!read"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, '!read', 'op should be !read');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark an item (message) as flagged', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark as flagged
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'flag', 'op should be flag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark an item (message) as unflagged', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Flag first, then unflag
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag"/>
			</ItemActionRequest>`, authToken
		);

		// Mark as unflagged
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!flag"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, '!flag', 'op should be !flag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Tag an item (message)', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Tag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'tag', 'op should be tag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Untag an item (message)', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag and tag the message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Untag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, '!tag', 'op should be !tag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Tag an item(message) with deleted tag-id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Delete the tag
		const deleteTagRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);
		assert.notExists(deleteTagRes.Fault, 'TagActionRequest should not fault');

		// Try to tag message with deleted tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG', 'Should be NO_SUCH_TAG');
	});


	it('Regression | Untag an item(message) with deleted tag-id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag and tag the message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken
		);

		// Delete the tag
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Try to untag message with deleted tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG', 'Should be NO_SUCH_TAG');
	});


	it('Sanity | Move an item(message) to a valid folder', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(folderRes.CreateFolderResponse.folder) ? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder).id;

		// Move the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'move', 'op should be move');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Move an item(message) to a nonexisting folder', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create and delete a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(folderRes.CreateFolderResponse.folder) ? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder).id;

		// Delete the folder
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, authToken
		);

		// Try to move to deleted folder
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.exists(res.Fault.Detail.Error.Code, 'Should have error code');
	});


	it('Regression | ItemActionRequest without Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send ItemActionRequest without action tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest without id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send ItemActionRequest without id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest without op in Action tag', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send ItemActionRequest without op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with blank id', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send ItemActionRequest with blank id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="" op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with sometext at id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send ItemActionRequest with sometext at id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="some text" op="read"/>
			</ItemActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with invalid op attribute', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Blank op
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op=""/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res1.Fault, 'Blank op should return a Fault');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');

		// Spaces op
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="           "/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res2.Fault, 'Spaces op should return a Fault');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');

		// Sometext op
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="some text"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res3.Fault, 'Sometext op should return a Fault');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');

		// Special character op
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="//\\\\'^%"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res4.Fault, 'Special char op should return a Fault');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | ItemActionRequest with valid op and leading trailing all spaces', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Leading spaces in op
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="       read"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res1.Fault, 'Leading spaces in op should return a Fault');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');

		// Trailing spaces in op
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read    "/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res2.Fault, 'Trailing spaces in op should return a Fault');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');

		// All spaces in op
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="           "/>
			</ItemActionRequest>`, authToken, false
		);
		assert.exists(res3.Fault, 'All spaces in op should return a Fault');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Sanity | Update an item(message)', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag for the update
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="3"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Update the message with tag and color
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="update" t="${tagId}" color="3"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'update', 'op should be update');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Delete an item(message)', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Delete the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		const action = res.ItemActionResponse.action;
		assert.equal(action.op, 'delete', 'op should be delete');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Delete a non existing message', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Delete the message first
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);

		// Delete again - should still respond
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);

		// Verify the response still succeeds
		assert.notExists(res.Fault, 'ItemActionRequest should not fault');
		assert.exists(res.ItemActionResponse.action, 'action should exist');
	});
});
