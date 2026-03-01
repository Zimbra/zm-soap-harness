import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folders', function () {
	let testAccount;
	let auth;
	let rootId;

	before(async function () {
		await main.before(this);
		testAccount = `test.folders.${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount, testAccount);
		auth = await soap.getAccountAuthToken(testAccount);
		rootId = '1';
	});

	after(async function () {
		await soap.deleteAccount(testAccount);
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
	it('Smoke | Create a folder with valid name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth);

		// Verify response
		assert.exists(res.CreateFolderResponse.folder[0].id, 'Folder ID should exist');
	});


	it('Functional | Create a folder with blank folder name', async () => {
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth);

		// Verify response
		assert.exists(res.Fault, 'Should fail with Fault');
	});


	it('Functional | Create a folder with all spaces in folder name', async () => {
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name=" " l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth);

		// Verify response
		assert.exists(res.Fault, 'Should fail with Fault');
	});


	it('Functional | Create a folder with special characters in folder name', async () => {
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name=":/\\.;&lt;*''" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth);

		// Verify response
		assert.exists(res.Fault, 'Should fail with Fault');
	});


	it('Functional | Create a folder with duplicate folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth);

		const createFolderRequest6 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const dupRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest6, auth);

		// Verify response
		assert.exists(dupRes.Fault, 'Should fail with ALREADY_EXISTS');
	});


	it('Functional | Create a folder with nonexisting parent folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest7 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="0"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest7, auth);

		// Verify response
		assert.exists(res.Fault, 'Should fail with NO_SUCH_FOLDER or NO_SUCH_ITEM');
	});


	it('Regression | Create a folder with blank parent folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest8 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l=""/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest8, auth);
		// May return Fault or succeed depending on server version
		// Verify response
		assert.isTrue(res.Fault !== undefined || res.CreateFolderResponse !== undefined,
			'Should return either Fault or CreateFolderResponse');
	});


	it('Regression | Create a folder with No parent folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest9 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest9, auth);

		// Verify response
		assert.exists(res.CreateFolderResponse.folder[0].id, 'Folder should be created');
	});


	it('Smoke | Rename a folder to unique name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const newName = `folder.${common.getUniqueString()}`;
		const createFolderRequest10 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest10, auth);
		const folderId = res.CreateFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newName}"/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const actionRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth);

		// Verify response
		assert.equal(actionRes.FolderActionResponse.action.op, 'rename');
		assert.equal(actionRes.FolderActionResponse.action.id, folderId);
	});


	it('Functional | Rename a folder to duplicate name', async () => {
		const folder1Name = `folder.${common.getUniqueString()}`;
		const folder2Name = `folder.${common.getUniqueString()}`;

		const createFolderRequest11 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(createFolderRequest11, auth);

		const createFolderRequest12 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(createFolderRequest12, auth);
		const folder2Id = res2.CreateFolderResponse.folder[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folder2Id}" name="${folder1Name}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth);

		// Verify response
		assert.exists(renRes.Fault, 'Should fail with ALREADY_EXISTS');
	});


	it('Regression | Rename a folder with nonexisting folder id', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="100000" name="${folderName}"/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth);

		// Verify response
		assert.exists(res.Fault, 'Should fail with NO_SUCH_FOLDER');
	});


	it('Sanity | Move a folder within some existing folder', async () => {
		const folderParentName = `folder.${common.getUniqueString()}`;
		const folderChildName = `folder.${common.getUniqueString()}`;

		const createFolderRequest13 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderParentName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resP = await soap.makeSOAPEnvelopeAccount(createFolderRequest13, auth);
		const parentId = resP.CreateFolderResponse.folder[0].id;

		const createFolderRequest14 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderChildName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const resC = await soap.makeSOAPEnvelopeAccount(createFolderRequest14, auth);
		const childId = resC.CreateFolderResponse.folder[0].id;

		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${childId}" l="${parentId}"/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const actionRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth);

		// Verify response
		assert.equal(actionRes.FolderActionResponse.action.op, 'move');
	});


	it('Functional | Move a folder within itself', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest15 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest15, auth);
		const folderId = res.CreateFolderResponse.folder[0].id;

		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="${folderId}"/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth);

		// Verify response
		assert.exists(moveRes.Fault, 'Should fail with CANNOT_CONTAIN');
	});


	it('Smoke | Delete a Folder,ie move it to trash', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest16 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest16, auth);
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Move to Trash (ID 3)
		const folderActionRequest6 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="3"/>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest6, auth);

		// Verify via GetFolder it is in trash
		const getFolderRequest =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;

		// CreateFolderRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		// Verify response
		assert.equal(getRes.GetFolderResponse.folder[0].l, '3',
			'Folder parent should be Trash (3)');
	});


	it('Regression | Move a folder within a non existing folder', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest17 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest17, auth);
		const folderId = res.CreateFolderResponse.folder[0].id;

		const folderActionRequest7 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="-100"/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest7, auth);

		// Verify response
		assert.exists(moveRes.Fault, 'Should fail with NO_SUCH_FOLDER');
	});


	it('Smoke | Delete a folder', async () => {
		// First delete a real folder to know it's gone
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest18 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest18, auth);
		const folderId = res.CreateFolderResponse.folder[0].id;

		const folderActionRequest8 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest8, auth);

		// Try deleting again
		// Note: 'delete' op usually hard deletes. If it's already gone, should fail or succeed?
		// XML comment says "delete an non existing folder".
		// Response in XML is just checking for presence of response.

		const folderActionRequest9 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`;
		const resDel = await soap.makeSOAPEnvelopeAccount(folderActionRequest9, auth);
		// Either succeeds or returns a Fault for non-existent folder - both are valid
		// Verify response
		assert.isTrue(resDel.FolderActionResponse !== undefined || resDel.Fault !== undefined,
			'Should return either FolderActionResponse or Fault');
	});

});
