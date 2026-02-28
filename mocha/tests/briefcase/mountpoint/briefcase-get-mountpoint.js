import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Briefcase > MountPoint > Briefcase Get Mountpoint', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Token;
	let account2Name;
	let account2Token;
	let briefcaseFolderId1;
	let folder1Id;
	let subFolderName;
	let subFolderId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		// Create account2
		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Auth account1
		account1Token = await soap.getAccountAuthToken(account1Name);

		// GetFolderRequest
		const folderRes1 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const root1 = Array.isArray(folderRes1.GetFolderResponse.folder)
			? folderRes1.GetFolderResponse.folder[0]
			: folderRes1.GetFolderResponse.folder;
		const subfolders1 = Array.isArray(root1.folder) ? root1.folder : [root1.folder];
		const briefcase1 = subfolders1.find(f => f && f.name === 'Briefcase');
		briefcaseFolderId1 = briefcase1.id;

		// Auth account2
		account2Token = await soap.getAccountAuthToken(account2Name);

		// GetFolderRequest
		const folderRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);

		// Verify response
		assert.notExists(folderRes2.Fault, 'Response should not be a Fault');
		assert.exists(folderRes2.GetFolderResponse, 'GetFolderResponse should exist');

		// Create a folder under account1's briefcase
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId1}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(createFolderRes.CreateFolderResponse,
			'CreateFolderResponse should exist');
		const folder1 = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		folder1Id = folder1.id;

		// Share folder with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder1Id}" op="grant">
					<grant d="${account2Name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Create sub-folder and save a document in it
		const subFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId1}" name="subfolder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);
		const subFolder = Array.isArray(subFolderRes.CreateFolderResponse.folder)
			? subFolderRes.CreateFolderResponse.folder[0]
			: subFolderRes.CreateFolderResponse.folder;
		subFolderName = subFolder.name;
		subFolderId = subFolder.id;

		// Save a document in the sub-folder
		// NOTE: Original XML uses uploadservlettest — using SOAP SaveDocument as substitute
		await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="contact1.txt" l="${subFolderId}">
					<content>test contact content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Share the entire briefcase with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseFolderId1}" op="grant">
					<grant d="${account2Name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify GetFolder by path of the shared folder works', async () => {
		// Create mountpoint for the specific folder
		const mountName = 'user1s folder ' + common.getUniqueString();

		// CreateMountpointRequest
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" rid="${folder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.notExists(mountRes.Fault, 'Response should not be a Fault');
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');

		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const mountedName = link.name;

		// GetFolder by path
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder path="${mountedName}"/>
			</GetFolderRequest>`, account2Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetFolderResponse, 'GetFolderResponse should exist');
	});


	it('Functional | Verify GetFolder by path of the shared sub-folder works', async () => {
		// Create mountpoint for the entire briefcase
		const mountName = 'acct2.briefcase.' + common.getUniqueString();

		// CreateMountpointRequest
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" rid="${briefcaseFolderId1}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.notExists(mountRes.Fault, 'Response should not be a Fault');
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');

		// GetFolder by path for the sub-folder
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder path="${mountName}/${subFolderName}"/>
			</GetFolderRequest>`, account2Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetFolderResponse, 'GetFolderResponse should exist');

		// Search the sub-folder's document
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:${mountName}/${subFolderName}/</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
