import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Briefcase Get Folder', function () {
	this.timeout(30 * 1000);
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account
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
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Get briefcase folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');

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
	it('Smoke | Create a briefcase folder. GetFolderRequest to verify the settings', async () => {
		const folderName = 'briefcase1.' + common.getUniqueString();

		// Create briefcase subfolder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${briefcaseFolderId}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		folder.id;

		// Verify with GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(getFolderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const rootFolder = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;

		// Verify response
		assert.exists(rootFolder, 'folder should exist');
	});
});
