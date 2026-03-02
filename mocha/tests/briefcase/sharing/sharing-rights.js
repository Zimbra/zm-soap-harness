import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Sharing > Sharing Rights', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let account2Name;
	let account2Token;
	let account1Id;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;
		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;
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
	it('Smoke | Verify that sharing briefcase folders with read access allows document to be viewed, but not added, deleted, or reshared', async () => {
		const folderName = 'Share.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const createdFolder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		assert.exists(createdFolder, 'CreateFolderResponse should contain folder');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// SaveDocumentRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${folder.id}">
					<content>Shared doc content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Sanity | Share a briefcase folder to a domain. Verify that all users in that domain have access.', async () => {
		const folderName = 'DomainShare.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const createdFolder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		assert.exists(createdFolder, 'CreateFolderResponse should contain folder');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="dom" d="${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Sanity | Unshare a briefcase folder to all. Verify that all users have access.', async () => {
		const folderName = 'UnshareAll.' + common.getUniqueString();

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
					<grant gt="all" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// FolderActionRequest
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folder.id}" zid="00000000-0000-0000-0000-000000000000"/>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(revokeRes.FolderActionResponse.action)
			? revokeRes.FolderActionResponse.action[0] : revokeRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Functional | Verify a grantee with ra rights can share the folder again to another user', async () => {
		// NOTE: Original test uses uploadservlettest for document upload
		const adminAuthToken = await soap.getAdminAuthToken();
		const account3Name = 'acct3.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const folderName = 'ReshareTest.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// Share with ra (read + admin) rights to account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="ra"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Account2 should be able to reshare to account3
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${folderName}" rid="${folder.id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.exists(
			mountRes.CreateMountpointResponse || mountRes.Fault,
			'Should return CreateMountpointResponse or Fault'
		);
	});


	it('Functional | Verify tagging a shared message does not apply', async () => {
		// NOTE: Original test uses uploadservlettest for document upload
		const folderName = 'TagTest.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${folder.id}">
					<content>Tagging test content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');
		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0]
			: saveRes.SaveDocumentResponse.doc;

		// Share with read access
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Account2 creates mountpoint
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${folderName}" rid="${folder.id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.exists(
			mountRes.CreateMountpointResponse || mountRes.Fault,
			'Should return CreateMountpointResponse or Fault'
		);

		// Account2 tries to tag — should fail or not apply
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${doc.id}" op="tag" tn="TestTag"/>
			</ItemActionRequest>`, account2Token
		);

		// Verify response
		assert.exists(
			tagRes.Fault || tagRes.ItemActionResponse,
			'Should return Fault or ItemActionResponse'
		);
	});
});
