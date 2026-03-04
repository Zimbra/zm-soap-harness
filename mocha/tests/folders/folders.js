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
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + testAccount + '</account></GetAccountInfoRequest>', auth
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
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
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const folder = res.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Folder name should match requested name');
	});


	it('Functional | Create a folder with blank folder name', async () => {
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth);

		// Verify response
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Functional | Create a folder with all spaces in folder name', async () => {
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name=" " l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth);

		// Verify response
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Functional | Create a folder with special characters in folder name', async () => {
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name=":/\\.;&lt;*''" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth);

		// Verify response
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Functional | Create a folder with duplicate folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const firstRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth);
		assert.notExists(firstRes.Fault, 'First create should not be a Fault');
		assert.exists(firstRes.CreateFolderResponse.folder[0].id, 'First folder ID should exist');

		const createFolderRequest6 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const dupRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest6, auth);

		// Verify response
		assert.exists(dupRes.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(dupRes.Fault.Reason.Text, 'already exists',
			'Fault reason should indicate folder already exists');
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
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Regression | Create a folder with blank parent folder name', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest8 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l=""/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest8, auth);
		// Verify response - creating folder with blank location should fail
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
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
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const folder = res.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Folder name should match requested name');
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
		assert.notExists(res.Fault, 'Create response should not be a Fault');
		const folderId = res.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Created folder ID should exist');

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newName}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const actionRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth);

		// Verify response
		assert.notExists(actionRes.Fault, 'Rename response should not be a Fault');
		assert.equal(actionRes.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');
		assert.equal(actionRes.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
	});


	it('Functional | Rename a folder to duplicate name', async () => {
		const folder1Name = `folder.${common.getUniqueString()}`;
		const folder2Name = `folder.${common.getUniqueString()}`;

		const createFolderRequest11 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(createFolderRequest11, auth);
		assert.notExists(res1.Fault, 'First create should not be a Fault');
		assert.exists(res1.CreateFolderResponse.folder[0].id, 'First folder ID should exist');

		const createFolderRequest12 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(createFolderRequest12, auth);
		assert.notExists(res2.Fault, 'Second create should not be a Fault');
		const folder2Id = res2.CreateFolderResponse.folder[0].id;
		assert.exists(folder2Id, 'Second folder ID should exist');

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folder2Id}" name="${folder1Name}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth);

		// Verify response
		assert.exists(renRes.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(renRes.Fault.Reason.Text, 'already exists',
			'Fault reason should indicate folder already exists');
	});


	it('Regression | Rename a folder with nonexisting folder id', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="100000" name="${folderName}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth);

		// Verify response
		assert.exists(res.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
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
		assert.notExists(resP.Fault, 'Parent create should not be a Fault');
		const parentId = resP.CreateFolderResponse.folder[0].id;
		assert.exists(parentId, 'Parent folder ID should exist');

		const createFolderRequest14 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderChildName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resC = await soap.makeSOAPEnvelopeAccount(createFolderRequest14, auth);
		assert.notExists(resC.Fault, 'Child create should not be a Fault');
		const childId = resC.CreateFolderResponse.folder[0].id;
		assert.exists(childId, 'Child folder ID should exist');

		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${childId}" l="${parentId}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const actionRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth);

		// Verify response
		assert.notExists(actionRes.Fault, 'Move response should not be a Fault');
		assert.equal(actionRes.FolderActionResponse.action.op, 'move',
			'Verify op is move');
		assert.equal(actionRes.FolderActionResponse.action.id, childId,
			'Verify folder id in response');
	});


	it('Functional | Move a folder within itself', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest15 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest15, auth);
		assert.notExists(res.Fault, 'Create response should not be a Fault');
		const folderId = res.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Created folder ID should exist');

		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="${folderId}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth);

		// Verify response
		assert.exists(moveRes.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(moveRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Smoke | Delete a Folder,ie move it to trash', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest16 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest16, auth);
		assert.notExists(res.Fault, 'Create response should not be a Fault');
		const folderId = res.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Created folder ID should exist');

		// Move to Trash (ID 3)
		const folderActionRequest6 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="3"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest6, auth);
		assert.notExists(moveRes.Fault, 'Move to trash should not be a Fault');
		assert.equal(moveRes.FolderActionResponse.action.op, 'move',
			'Verify op is move');
		assert.equal(moveRes.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');

		// Verify via GetFolder it is in trash
		const getFolderRequest =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFolder response should not be a Fault');
		const folderGet = getRes.GetFolderResponse.folder[0];
		assert.exists(folderGet.id, 'Folder ID should exist in GetFolder response');
		assert.equal(folderGet.l, '3',
			'Folder parent should be Trash (3)');
	});


	it('Regression | Move a folder within a non existing folder', async () => {
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest17 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest17, auth);
		assert.notExists(res.Fault, 'Create response should not be a Fault');
		const folderId = res.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Created folder ID should exist');

		const folderActionRequest7 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="-100"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest7, auth);

		// Verify response
		assert.exists(moveRes.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(moveRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Smoke | Delete a folder', async () => {
		// First delete a real folder to know it's gone
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolderRequest18 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest18, auth);
		assert.notExists(res.Fault, 'Create response should not be a Fault');
		const folderId = res.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Created folder ID should exist');

		const folderActionRequest8 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const delRes = await soap.makeSOAPEnvelopeAccount(folderActionRequest8, auth);
		assert.notExists(delRes.Fault, 'Delete response should not be a Fault');
		assert.equal(delRes.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
		assert.equal(delRes.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');

		// Try deleting again
		const folderActionRequest9 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`;
		const resDel = await soap.makeSOAPEnvelopeAccount(folderActionRequest9, auth);
		// Verify response - re-delete is idempotent (should succeed)
		assert.notExists(resDel.Fault, 'Re-delete should not be a Fault');
		assert.equal(resDel.FolderActionResponse.action.id, folderId,
			'Verify folder id in re-delete response');
	});

});
