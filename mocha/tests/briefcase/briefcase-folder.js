import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Briefcase > Briefcase Folder', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Token;
	let account2Name;
	let account2Token;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		// Create account2
		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Auth as account1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes1.AuthResponse, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create briefcase folder', async () => {
		const folderName = 'Briefcase.' + common.getUniqueString();
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		assert.exists(folder.id, 'folder id should exist');
	});


	it('Regression | Try to create duplicate briefcase folder', async () => {
		const folderName = 'Briefcase.' + common.getUniqueString();

		// Create folder first time
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');

		// Try to create same folder again — should fail
		const dupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(dupRes.Fault, 'Should return Fault for duplicate folder');
		assert.include(dupRes.Fault.Detail.Error.Code, 'mail.ALREADY_EXISTS',
			'Should return ALREADY_EXISTS');
	});


	it('Sanity | Rename briefcase folder', async () => {
		const folderName = 'Briefcase.' + common.getUniqueString();
		const newFolderName = 'Briefcase.' + common.getUniqueString();

		// Create folder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Rename folder
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newFolderName}"/>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(renameRes.FolderActionResponse,
			'FolderActionResponse should exist');
		const action = Array.isArray(renameRes.FolderActionResponse.action)
			? renameRes.FolderActionResponse.action[0] : renameRes.FolderActionResponse.action;
		assert.equal(action.op, 'rename', 'op should be rename');
	});


	it('Smoke | Delete briefcase folder', async () => {
		const folder3Name = 'Briefcase.' + common.getUniqueString();
		const folder4Name = 'Briefcase.' + common.getUniqueString();

		// Create folder3
		const create3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder3Name}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(create3.CreateFolderResponse, 'CreateFolderResponse should exist');

		const folder3 = Array.isArray(create3.CreateFolderResponse.folder)
			? create3.CreateFolderResponse.folder[0] : create3.CreateFolderResponse.folder;
		const folder3Id = folder3.id;

		// Create folder4
		const create4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder4Name}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(create4.CreateFolderResponse, 'CreateFolderResponse should exist');

		const folder4 = Array.isArray(create4.CreateFolderResponse.folder)
			? create4.CreateFolderResponse.folder[0] : create4.CreateFolderResponse.folder;
		const folder4Id = folder4.id;

		// Trash folder3
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${folder3Id}"/>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(trashRes.FolderActionResponse, 'FolderActionResponse should exist');

		const trashAction = Array.isArray(trashRes.FolderActionResponse.action)
			? trashRes.FolderActionResponse.action[0] : trashRes.FolderActionResponse.action;
		assert.equal(trashAction.op, 'trash', 'op should be trash');

		// Delete folder4
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folder4Id}"/>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(deleteRes.FolderActionResponse,
			'FolderActionResponse should exist');
		const deleteAction = Array.isArray(deleteRes.FolderActionResponse.action)
			? deleteRes.FolderActionResponse.action[0] : deleteRes.FolderActionResponse.action;
		assert.equal(deleteAction.op, 'delete', 'op should be delete');
	});


	it('Smoke | Share briefcase folder', async () => {
		const folderName = 'Briefcase.' + common.getUniqueString();

		// Create briefcase folder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0] : createRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Save a document to the folder
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${folderId}">
					<content>Shared briefcase document content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Share folder with account2
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(shareRes.FolderActionResponse, 'FolderActionResponse should exist');

		// Auth as account2
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes2.AuthResponse, 'AuthResponse should exist');

		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// Get root folder id for account2
		const folderRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.exists(folderRes2.GetFolderResponse, 'GetFolderResponse should exist');

		const root2 = Array.isArray(folderRes2.GetFolderResponse.folder)
			? folderRes2.GetFolderResponse.folder[0] : folderRes2.GetFolderResponse.folder;
		const rootId2 = root2.id;

		// Create mountpoint
		const sharedFolderName = 'Shared.' + common.getUniqueString();
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId2}" name="${sharedFolderName}" rid="${folderId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.equal(link.owner, account1Name, 'owner should be account1');

		// Search for shared document
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:(${sharedFolderName})</query>
			</SearchRequest>`, account2Token
		);
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Delete shared folder as account1
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(deleteRes.FolderActionResponse,
			'FolderActionResponse should exist');
	});
});
