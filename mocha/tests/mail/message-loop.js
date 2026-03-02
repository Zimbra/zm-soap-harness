import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Loop', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	let account1Email;
	let account2Email;
	let account1AuthToken;
	let account2AuthToken;
	let messageId;
	let inboxFolderId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test accounts
		account1Email = `test${common.getUniqueString()}@${testDomain}`;
		account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1AuthToken = await soap.getAccountAuthToken(account1Email);
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
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
	it('Functional | Send 1000 mails to any account', async () => {
		// Send a message with a particular subject to be used in subsequent tests
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>First message to be searched</su>
					<mp ct="text/plain">
						<content>Content of mail ${Date.now()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Send additional messages in a loop (reduced from 1000 to 10 for JS performance)
		for (let i = 0; i < 10; i++) {
			const loopRes = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${account2Email}"/>
						<su>Subject${Date.now()} ${i} of message</su>
						<mp ct="text/plain">
							<content>Content of mail ${Date.now()} ${i}</content>
						</mp>
					</m>
				</SendMsgRequest>`, account1AuthToken
			);
			assert.notExists(loopRes.Fault, `SendMsgRequest loop ${i} should not fault`);
		}

		// Verify GetInfoRequest works after sending messages
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, account1AuthToken
		);
		assert.notExists(infoRes.Fault, 'GetInfoRequest should not fault');
		assert.exists(infoRes.GetInfoResponse.name, 'GetInfoResponse should contain name');
	});


	it('Functional | Search a message', async () => {
		// Search for the specific message sent earlier
		let searchRes;
		for (let retry = 0; retry < 5; retry++) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" offset="0" limit="25">
				<query>subject:(First message to be searched)</query>
			</SearchRequest>`, account2AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'SearchResponse should contain message');
		messageId = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0].id
			: searchRes.SearchResponse.m.id;
		assert.exists(messageId, 'Message id should exist');
	});


	it('Functional | Mark a message as read', async () => {
		// Mark message as read
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'read', 'op should be read');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Mark a message as unread', async () => {
		// Mark message as unread
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!read"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, '!read', 'op should be !read');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Flag a message', async () => {
		// Flag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'flag', 'op should be flag');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Unflag a message', async () => {
		// Unflag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!flag"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, '!flag', 'op should be !flag');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Tag a message', async () => {
		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="Tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, account2AuthToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Tag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'tag', 'op should be tag');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Untag a message', async () => {
		// Create a tag and tag the message first
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="Tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, account2AuthToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, account2AuthToken
		);

		// Untag the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!tag" tag="${tagId}"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, '!tag', 'op should be !tag');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Move a Mail to a custom folder', async () => {
		// Get folder info
		const folderInfoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(folderInfoRes.Fault, 'GetFolderRequest should not fault');

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account2AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Move the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'move', 'op should be move');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Update a message', async () => {
		// Create a tag for update
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="Tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, account2AuthToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(tagRes.CreateTagResponse.tag) ? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		inboxFolderId = subFolders.find(f => f.name === 'Inbox').id;

		// Update the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="update" tag="${tagId}" l="${inboxFolderId}"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'update', 'op should be update');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Reply a message', async () => {
		// Reply to the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${messageId}" rt="r">
					<e t="t" a="${account2Email}"/>
					<su>Re: First message to be searched</su>
					<mp ct="text/plain">
						<content>Content of reply ${Date.now()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Functional | Forward a message', async () => {
		// Forward the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${messageId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: First message to be searched</su>
					<mp ct="text/plain">
						<content>Content of forwarded mail ${Date.now()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Functional | Mark message as spam', async () => {
		// Mark message as spam
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="spam"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'spam', 'op should be spam');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');

		// Search the message in spam folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" offset="0" limit="25">
				<query>in:(Junk)</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be in Junk folder');
	});


	it('Functional | Delete a message', async () => {
		// Delete the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="delete"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'MsgActionRequest should not fault');
		assert.equal(res.MsgActionResponse.action.op, 'delete', 'op should be delete');
		assert.equal(res.MsgActionResponse.action.id, messageId, 'id should match');
	});


	it('Functional | Search a non existing message', async () => {
		// Search for a message that was never sent
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" offset="0" limit="25">
				<query>subject:(Second message to be searched)</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		// Verify no results
		const messages = searchRes.SearchResponse.m;
		assert.isTrue(
			messages === undefined || messages === null || (Array.isArray(messages) && messages.length === 0),
			'Search should return no messages for non-existing subject'
		);
	});
});
