import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Conversation > Tcon > Conv Action Request Tcon S', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Helper: create account, conversation with msgs in sent + inbox
	async function setupConvWithSent() {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
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
		const authToken = await soap.getAccountAuthToken(email);

		const subject = `Subject${common.getUniqueString()}`;
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content of the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');
		const msgId1 = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId1}" rt="w">
					<e t="t" a="${email}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;

		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0] : getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const sentFolder = folders.find(f => f.name === 'Sent');
		const inboxFolder = folders.find(f => f.name === 'Inbox');

		return { authToken, convId: conv.id, sentFolder, inboxFolder };
	}

	// Tests
	it('Functional | Tag only messages in Sent folder in a conversation', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, authToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tag.id}" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'tag', 'Operation should be tag');
	});


	it('Functional | Tag all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="2"/>
			</CreateTagRequest>`, authToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tag.id}" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'tag', 'Operation should be tag');
	});


	it('Functional | Untag all messages in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="3"/>
			</CreateTagRequest>`, authToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send conv action request
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tag.id}"/>
			</ConvActionRequest>`, authToken
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tag.id}" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!tag', 'Operation should be !tag');
	});


	it('Functional | Untag all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="4"/>
			</CreateTagRequest>`, authToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Send conv action request
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tag.id}"/>
			</ConvActionRequest>`, authToken
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tag.id}" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!tag', 'Operation should be !tag');
	});


	it('Functional | Flag all messages in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'flag', 'Operation should be flag');
	});


	it('Functional | Flag all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'flag', 'Operation should be flag');
	});


	it('Functional | Unflag all messages in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag"/>
			</ConvActionRequest>`, authToken
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!flag" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!flag', 'Operation should be !flag');
	});


	it('Functional | Unflag all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag"/>
			</ConvActionRequest>`, authToken
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!flag" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!flag', 'Operation should be !flag');
	});


	it('Functional | Mark all messages in Sent folder as Read', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'read', 'Operation should be read');
	});


	it('Functional | Mark all messages in Sent folder as Unread', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!read" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!read', 'Operation should be !read');
	});


	it('Functional | Mark all messages except those in Sent folder as Read', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'read', 'Operation should be read');
	});


	it('Functional | Mark all messages except those in Sent folder as Unread', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!read" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, '!read', 'Operation should be !read');
	});


	it('Functional | Move all messages in Sent folder to Inbox', async () => {
		const { authToken, convId, inboxFolder } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${inboxFolder.id}" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'move', 'Operation should be move');
	});


	it('Functional | Move all messages except those in Sent folder to Sent', async () => {
		const { authToken, convId, sentFolder } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${sentFolder.id}" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'move', 'Operation should be move');
	});


	it('Functional | Delete all messages in Sent folder in a conversation', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete" tcon="s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'delete', 'Operation should be delete');
	});


	it('Functional | Delete all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'delete', 'Operation should be delete');
	});



	it('Functional | Spam all messages except those in Sent folder', async () => {
		const { authToken, convId } = await setupConvWithSent();

		// Send conv action request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="spam" tcon="-s"/>
			</ConvActionRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'spam', 'Operation should be spam');
	});
});
