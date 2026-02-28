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
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		auth = await soap.getAccountAuthToken(accountEmail);

		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		rootId = getFolder.GetFolderResponse.folder[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Creating 1000 nested folders', async function () {
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

		// CreateFolderRequest
		const getInfo = await soap.makeSOAPEnvelopeAccount(getInfoRequest, auth);

		// Verify response
		assert.exists(getInfo.GetInfoResponse.name,
			'Verify GetInfo should return success');
	});


	it('Functional | Creating a folder to test various operation', async () => {
		const folderName = `folder1${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// GetFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth);

		folderId = createRes.CreateFolderResponse.folder[0].id;

		// Verify response
		assert.exists(folderId, 'Verify folder created');
	});


	it('Functional | Basic test of GetFolderRequest', async () => {
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail' id='${rootId}'/>`;

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth);

		// Verify response
		assert.exists(getFolder.GetFolderResponse.folder,
			'Verify GetFolderResponse returns folder');
	});


	it('Functional | Creating a duplicate folder', async () => {
		const folderName = `DupNested${common.getUniqueString()}`;
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(createRequest1, auth);

		// Try creating duplicate
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const dupResp = await soap.makeSOAPEnvelopeAccount(createRequest2, auth);

		// Verify response
		assert.exists(dupResp.Fault, 'Verify Fault for duplicate folder');
		assert.include(dupResp.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Rename a folder', async () => {
		const folderName = `RenameNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		const id = createRes.CreateFolderResponse.folder[0].id;

		const newName = `RenamedNested${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${id}' name='${newName}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, auth);

		// Verify response
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
		const parentId = createRes1.CreateFolderResponse.folder[0].id;

		const folderName2 = `MoveChild${common.getUniqueString()}`;
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName2}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(createRequest2, auth);
		const childId = createRes2.CreateFolderResponse.folder[0].id;

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${childId}' l='${parentId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, auth);

		// Verify response
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Empty a folder', async () => {
		const folderName = `EmptyNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		const id = createRes.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${id}'>
					<content>Subject: hello
					Test content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth);

		// Empty the folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${id}'/>
			</FolderActionRequest>`;

		// SearchRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');

		// Verify messages are gone
		const searchRequest =
			`<SearchRequest xmlns='urn:zimbraMail' types='message'>
				<query>in:"${folderName}"</query>
			</SearchRequest>`;

		// CreateFolderRequest
		const searchResponse = await soap.makeSOAPEnvelopeAccount(searchRequest, auth);

		// Verify response
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
		const parentId = parentRes.CreateFolderResponse.folder[0].id;

		const subName = `EmptySub${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subName}' l='${parentId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createSubRequest, auth);

		// Empty parent
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${parentId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');
	});


	it('Functional | Delete a folder', async () => {
		const folderName = `DeleteNested${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth);
		const id = createRes.CreateFolderResponse.folder[0].id;

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${id}'/>
			</FolderActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, auth);

		// Verify response
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
	});
});
