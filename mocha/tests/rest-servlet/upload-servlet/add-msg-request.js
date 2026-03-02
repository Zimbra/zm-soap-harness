import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Upload Servlet > Add Msg Request', function () {
	this.timeout(30 * 1000);
	let account1Token;
	let inboxId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1Name = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct.id, 'Account should have an id');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Get inbox folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');

		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0]
			: folderRes.GetFolderResponse.folder;
		const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const inbox = subfolders.find(f => f && f.name === 'Inbox');

		// Verify response
		assert.exists(inbox, 'Inbox folder should exist');

		inboxId = inbox.id;
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
	it('Sanity | Add a message that was uploaded using the upload servlet', async () => {
		// Upload file
		const filePath = path.resolve('data/email01/msg01.txt');
		const attachmentId = await soap.uploadFile(account1Token, filePath);

		// Verify response
		assert.exists(attachmentId, 'Upload should return attachment id');

		// Add message to inbox
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}" aid="${attachmentId}"/>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const addedMsg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		assert.exists(addedMsg, 'AddMsgResponse should contain m');

		// Verify response
		assert.exists(addedMsg.id, 'Added message should have an id');

		// Verify message exists via GetMsgRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${addedMsg.id}"/>
			</GetMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const getMsg = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0] : getRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		// Verify response
		assert.equal(getMsg.id, addedMsg.id, 'Message id should match');
	});
});
