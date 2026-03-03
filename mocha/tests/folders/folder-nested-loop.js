import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Nested Loop', function () {
	this.timeout(120 * 1000);
	let auth;
	let rootId;
	let folderId;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		auth = await soap.getAccountAuthToken(accountEmail);

		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		rootId = getFolder.GetFolderResponse.folder[0].id;
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
	it('Functional | Creating 1000 nested folders', async () => {
		this.timeout(300 * 1000);
		const count = 100;
		let parentId = rootId;

		for (let i = 0; i < count; i++) {
			const createFolderRequest =
				`<CreateFolderRequest xmlns='urn:zimbraMail'>
					<folder name='folder${common.getUniqueString()}' l='${parentId}'/>
				</CreateFolderRequest>`;

			// GetInfoRequest
			const res = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth);

			parentId = res.CreateFolderResponse.folder[0].id;
		}

		const getInfoRequest = '<GetInfoRequest xmlns=\'urn:zimbraAccount\'/>';

		// GetInfoRequest
		const getInfo = await soap.makeSOAPEnvelopeAccount(getInfoRequest, auth);

		// Verify response
		assert.notExists(getInfo.Fault, 'Response should not be a Fault');
		assert.exists(getInfo.GetInfoResponse.name,
			'Verify GetInfo should return success');
	});


	it('Functional | Creating a folder to test various operation', async () => {
		const folderName = `folder1${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth);

		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		folderId = createRes.CreateFolderResponse.folder[0].id;

		// Verify response
		assert.exists(folderId, 'Verify folder created');
		assert.isString(folderId, 'Verify folder id is a string');
	});


	it('Functional | Basic test of GetFolderRequest', async () => {
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail' id='${rootId}'/>`;

		// GetFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		// Verify response
		assert.notExists(getFolder.Fault, 'Response should not be a Fault');
		assert.exists(getFolder.GetFolderResponse.folder[0].id,
			'Verify GetFolderResponse returns folder with id');
	});


	it('Functional | Creating a duplicate folder', async () => {
		const folderName = `DupNested${common.getUniqueString()}`;
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes1 = await soap.makeSOAPEnvelopeAccount(createRequest1, auth);
		assert.notExists(createRes1.Fault, 'First create should not be a Fault');
		assert.exists(createRes1.CreateFolderResponse.folder[0].id, 'First folder ID should exist');

		// Try creating duplicate
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const dupResp = await soap.makeSOAPEnvelopeAccount(createRequest2, auth);

		// Verify response
		assert.exists(dupResp.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(dupResp.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Rename a folder', async () => {
		const folderName = `RenameNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const id = createRes.CreateFolderResponse.folder[0].id;
		assert.exists(id, 'Folder ID should exist');

		const newName = `RenamedNested${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${id}' name='${newName}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, auth);

		// Verify response
		assert.notExists(renameResponse.Fault, 'Rename should not be a Fault');
		assert.equal(renameResponse.FolderActionResponse.action.id, id,
			'Verify folder id in response');
		assert.equal(renameResponse.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');
	});


	it('Functional | Move a folder', async () => {
		const folderName1 = `MoveParent${common.getUniqueString()}`;
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName1}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes1 = await soap.makeSOAPEnvelopeAccount(createRequest1, auth);
		assert.notExists(createRes1.Fault, 'Parent create should not be a Fault');
		const parentId = createRes1.CreateFolderResponse.folder[0].id;
		assert.exists(parentId, 'Parent folder ID should exist');

		const folderName2 = `MoveChild${common.getUniqueString()}`;
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName2}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(createRequest2, auth);
		assert.notExists(createRes2.Fault, 'Child create should not be a Fault');
		const childId = createRes2.CreateFolderResponse.folder[0].id;
		assert.exists(childId, 'Child folder ID should exist');

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${childId}' l='${parentId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, auth);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.id, childId,
			'Verify folder id in response');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Empty a folder', async () => {
		const folderName = `EmptyNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const id = createRes.CreateFolderResponse.folder[0].id;
		assert.exists(id, 'Folder ID should exist');

		// Add a message
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${id}'>
					<content>Subject: hello
					Test content</content>
				</m>
			</AddMsgRequest>`;

		// AddMsgRequest
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth);
		assert.notExists(addMsgRes.Fault, 'AddMsg should not be a Fault');

		// Empty the folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${id}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth);

		// Verify response
		assert.notExists(emptyResponse.Fault, 'Empty should not be a Fault');
		assert.equal(emptyResponse.FolderActionResponse.action.id, id,
			'Verify folder id in response');
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');

		// Verify messages are gone
		const searchRequest =
			`<SearchRequest xmlns='urn:zimbraMail' types='message'>
				<query>in:"${folderName}"</query>
			</SearchRequest>`;

		// SearchRequest
		const searchResponse = await soap.makeSOAPEnvelopeAccount(searchRequest, auth);

		// Verify response
		assert.notExists(searchResponse.Fault, 'Search should not be a Fault');
		assert.notExists(searchResponse.SearchResponse.m,
			'Verify messages are gone after empty');
	});


	it('Functional | Empty a folder having a sub folder in it', async () => {
		const parentName = `EmptyParent${common.getUniqueString()}`;
		const createParentRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${parentName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const parentRes = await soap.makeSOAPEnvelopeAccount(createParentRequest, auth);
		assert.notExists(parentRes.Fault, 'Parent create should not be a Fault');
		const parentId = parentRes.CreateFolderResponse.folder[0].id;
		assert.exists(parentId, 'Parent folder ID should exist');

		const subName = `EmptySub${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subName}' l='${parentId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const subRes = await soap.makeSOAPEnvelopeAccount(createSubRequest, auth);
		assert.notExists(subRes.Fault, 'Sub create should not be a Fault');
		assert.exists(subRes.CreateFolderResponse.folder[0].id, 'Sub folder ID should exist');

		// Empty parent
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${parentId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth);

		// Verify response
		assert.notExists(emptyResponse.Fault, 'Empty should not be a Fault');
		assert.equal(emptyResponse.FolderActionResponse.action.id, parentId,
			'Verify folder id in response');
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');
	});


	it('Functional | Delete a folder', async () => {
		const folderName = `DeleteNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const id = createRes.CreateFolderResponse.folder[0].id;
		assert.exists(id, 'Folder ID should exist');

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${id}'/>
			</FolderActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, auth);

		// Verify response
		assert.notExists(deleteResponse.Fault, 'Delete should not be a Fault');
		assert.equal(deleteResponse.FolderActionResponse.action.id, id,
			'Verify folder id in response');
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
	});
});
