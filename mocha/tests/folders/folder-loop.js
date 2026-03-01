import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Loop', function () {
	this.timeout(120 * 1000);
	let auth;
	let rootId;
	let folderId;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		auth = await soap.getAccountAuthToken(accountEmail);

		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth, true);

		rootId = getFolder.GetFolderResponse.folder[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Creating 500 search folders at root level', async () => {
		this.timeout(300 * 1000);
		const count = 50;

		for (let i = 0; i < count; i++) {
			const createFolderRequest =
				`<CreateFolderRequest xmlns='urn:zimbraMail'>
					<folder name='folder${common.getUniqueString()}' l='${rootId}'/>
				</CreateFolderRequest>`;

			// GetInfoRequest
			await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth, true);
		}

		const getInfoRequest = '<GetInfoRequest xmlns=\'urn:zimbraAccount\'/>';

		// CreateFolderRequest
		const getInfo = await soap.makeSOAPEnvelopeAccount(getInfoRequest, auth, true);

		// Verify response
		assert.exists(getInfo.GetInfoResponse.name,
			'Verify GetInfo should return success');
	});


	it('Functional | Creating a folder to test various operation', async () => {
		const folderName = `Namefolder1${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// GetFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth, true);

		folderId = createRes.CreateFolderResponse.folder[0].id;

		// Verify response
		assert.exists(folderId, 'Verify folder created');
	});


	it('Functional | Basic test of GetFolderRequest', async () => {
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail' id='${rootId}'/>`;

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth, true);

		// Verify response
		assert.exists(getFolder.GetFolderResponse.folder,
			'Verify GetFolderResponse returns folder');
	});


	it('Functional | Creating a duplicate folder', async () => {
		const folderName = `DupFolder${common.getUniqueString()}`;
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(createRequest1, auth, true);

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
		const folderName = `RenameLoop${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth, true);
		const id = createRes.CreateFolderResponse.folder[0].id;

		const newName = `RenamedLoop${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${id}' name='${newName}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, auth, true);

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
		const createRes1 = await soap.makeSOAPEnvelopeAccount(createRequest1, auth, true);
		const parentId = createRes1.CreateFolderResponse.folder[0].id;

		const folderName2 = `MoveChild${common.getUniqueString()}`;
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName2}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(createRequest2, auth, true);
		const childId = createRes2.CreateFolderResponse.folder[0].id;

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${childId}' l='${parentId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, auth, true);

		// Verify response
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Empty a folder', async () => {
		const folderName = `EmptyLoop${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth, true);
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
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth, true);

		// Empty the folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${id}'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth, true);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');

		// Verify folder still exists
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// CreateFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth, true);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse,
			'Verify folder still exists after empty');
	});


	it('Functional | Empty a folder having a sub folder in it', async () => {
		const parentName = `EmptyParent${common.getUniqueString()}`;
		const createParentRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${parentName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const parentRes = await soap.makeSOAPEnvelopeAccount(createParentRequest, auth, true);
		const parentId = parentRes.CreateFolderResponse.folder[0].id;

		const subName = `EmptySub${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subName}' l='${parentId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createSubRequest, auth, true);

		// Empty parent
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${parentId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, auth, true);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');
	});


	it('Functional | Delete a folder', async () => {
		const folderName = `DeleteLoop${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(createRequest, auth, true);
		const id = createRes.CreateFolderResponse.folder[0].id;

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${id}'/>
			</FolderActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, auth, true);

		// Verify response
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
	});
});
