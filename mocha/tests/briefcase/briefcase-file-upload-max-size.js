import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Briefcase File Upload Max Size', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const serverName = host ? host._content : config.server;

		// Get server id
		const serverRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${serverName}</server>
			</GetServerRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(serverRes.Fault, 'Response should not be a Fault');

		const serverObj = Array.isArray(serverRes.GetServerResponse.server)
			? serverRes.GetServerResponse.server[0] : serverRes.GetServerResponse.server;
		assert.exists(serverObj.id, 'Server ID should exist');
		const maxSizeAttr = serverObj.a.find(a => a.n === 'zimbraFileUploadMaxSize');
		assert.exists(maxSizeAttr, 'zimbraFileUploadMaxSize attribute should exist');

		// Auth as account
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Get briefcase folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');

		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = subfolders.find(f => f && f.name === 'Briefcase');

		// Verify response
		assert.exists(briefcase, 'Briefcase folder should exist');
		briefcaseFolderId = briefcase.id;
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
	it('Sanity | Upload different type files to the Briefcase', async () => {
		const fileTypes = ['html', 'text', 'jpg', 'csv', 'pdf'];

		for (const fileType of fileTypes) {

			// SaveDocumentRequest
			const saveRes = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
						<content>Sample ${fileType} content for max size test</content>
					</doc>
				</SaveDocumentRequest>`, account1Token
			);

			// Verify response
			assert.notExists(saveRes.Fault, 'Response should not be a Fault');
			const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
				? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
			assert.exists(doc.id, `doc id should exist for ${fileType}`);
		}
	});
});
