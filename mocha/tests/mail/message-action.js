import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Action', function () {
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
	it('Sanity | basic system check', async () => {
		// Verify the server is reachable via PingRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'PingRequest should not fault');
	});


	it('Smoke | Mark a mail as read', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark message as read
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, 'read', 'op should be read');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark a mail as unread', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark message as unread
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!read"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, '!read', 'op should be !read');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark a mail as flagged', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Mark message as flagged
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, 'flag', 'op should be flag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Mark a mail as unflagged', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Flag first, then unflag
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag"/>
			</MsgActionRequest>`, authToken
		);

		// Mark message as unflagged
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!flag"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, '!flag', 'op should be !flag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Tag a Mail', async () => {
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

		// Tag the mail
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, 'tag', 'op should be tag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Sanity | Untag the mail', async () => {
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
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, authToken
		);

		// Untag the mail
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!tag" tag="${tagId}"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, '!tag', 'op should be !tag');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Tag a mail with invalid id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Create a tag and then delete it
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Delete the tag
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, authToken
		);

		// Try to tag the mail with deleted tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG', 'Should be NO_SUCH_TAG');
	});


	it('Sanity | Move a Mail to a custom folder', async () => {
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

		// Move the mail
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, 'move', 'op should be move');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Move the mail to nonexisting folder', async () => {
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

		// Move to inbox first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="2"/>
			</MsgActionRequest>`, authToken
		);

		// Delete the folder
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, authToken
		);

		// Try to move to deleted folder
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Sanity | Delete a message', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Delete the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		const action = res.MsgActionResponse.action;
		assert.equal(action.op, 'delete', 'op should be delete');
		assert.equal(action.id, messageId, 'id should match message id');
	});


	it('Regression | Delete a non existing message', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Delete the message first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);

		// Delete again
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);

		// Verify the response still succeeds
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.exists(res.MsgActionResponse.action, 'action should exist');
	});


	it('Functional | MsgActionRequest without Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest without action tag
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Functional | MsgActionRequest without id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest without id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="delete"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Functional | MsgActionRequest without op in Action tag', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest without op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with Blank id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest with blank id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="" op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with Spaces at id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest with spaces at id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="           " op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with Special char at id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest with special char at id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="//\\\\''^%" op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with Some text at id in Action tag', async () => {
		// Setup account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send MsgActionRequest with some text at id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="some text" op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with Blank op but valid id in Action tag op', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with blank op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op=""/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with space in op but valid id in Action tag', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with space in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="           "/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with special char in op but valid id in Action tag op , ,', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with special char in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="//\\\\''^%"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with sometext in op but valid id in Action tag op some text', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with sometext in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="some text"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but leading spaces in id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with leading spaces in id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="         ${messageId}" op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but trailing spaces in id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with trailing spaces in id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}               " op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but both leading trailing spaces in id', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with both leading and trailing spaces in id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="          ${messageId}               " op="read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but leading spaces in op', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with leading spaces in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="        read"/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but trailing spaces in op', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with trailing spaces in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read        "/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Regression | MsgActionRequest with valid id and valid operation but both leading and trailing spaces in op', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Send MsgActionRequest with both leading and trailing spaces in op
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="         read        "/>
			</MsgActionRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be INVALID_REQUEST');
	});


	it('Sanity | Verify the MsgActionRequest(delete) after SyncRequest', async () => {
		// Setup account with a message in inbox
		const { authToken, messageId } = await setupAccountWithMessage();

		// Delete the message
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');
		const msgAction = Array.isArray(deleteRes.MsgActionResponse.action)
			? deleteRes.MsgActionResponse.action[0] : deleteRes.MsgActionResponse.action;
		assert.equal(msgAction.op, 'delete', 'op should be delete');

		// SyncRequest
		const syncRes = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(syncRes.Fault, 'SyncRequest should not fault');

		// Delete again after sync - should not NPE
		const deleteRes2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(deleteRes2.Fault, 'MsgActionRequest after sync should not fault');
	});
});
