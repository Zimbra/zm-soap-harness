import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Sharing > Sharing To Admin', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
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
	it('Sanity | Share a briefcase folder to all. Verify that all users have access.', async () => {
		const folderName = 'AdminShare1.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${config.adminUser}" perm="rwd"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		assert.exists(shareRes.FolderActionResponse, 'FolderActionResponse should exist');
	});


	it('Sanity | Unshare a briefcase folder to all. Verify that all users have access.', async () => {
		const folderName = 'AdminShare2.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${config.adminUser}" perm="rwd"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}"/>
			</GetFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(getFolderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const verifiedFolder = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;

		// Verify response
		assert.exists(verifiedFolder, 'folder should exist');
	});
});
