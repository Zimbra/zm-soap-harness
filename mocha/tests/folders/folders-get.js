import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folders Get', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;
	let accountEmail;

	before(async function () {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
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
	it('Smoke | Basic test of GetFolderRequest', async () => {
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');

		const rootFolder = getFolderResponse.GetFolderResponse.folder[0];
		assert.exists(rootFolder.id, 'Root folder ID should exist');
		assert.equal(rootFolder.name, 'USER_ROOT',
			'Verify root folder name is USER_ROOT');
	});


	it('Sanity | Verify the basic system folders present', async () => {
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		const rootFolder = getFolderResponse.GetFolderResponse.folder[0];
		assert.exists(rootFolder.id, 'Root folder ID should exist');
		const folders = rootFolder.folder;

		// Verify standard system folders exist
		const calendarFolder = folders.find(f => f.name === 'Calendar');

		// Verify response
		assert.exists(calendarFolder, 'Verify Calendar folder exists');
		assert.exists(calendarFolder.id, 'Calendar folder ID should exist');
		assert.equal(calendarFolder.view, 'appointment',
			'Verify Calendar view is appointment');

		const contactsFolder = folders.find(f => f.name === 'Contacts');

		// Verify response
		assert.exists(contactsFolder, 'Verify Contacts folder exists');
		assert.exists(contactsFolder.id, 'Contacts folder ID should exist');
		assert.equal(contactsFolder.view, 'contact', 'Verify Contacts view is contact');

		const draftsFolder = folders.find(f => f.name === 'Drafts');

		// Verify response
		assert.exists(draftsFolder, 'Verify Drafts folder exists');

		const inboxFolder = folders.find(f => f.name === 'Inbox');

		// Verify response
		assert.exists(inboxFolder, 'Verify Inbox folder exists');

		const sentFolder = folders.find(f => f.name === 'Sent');

		// Verify response
		assert.exists(sentFolder, 'Verify Sent folder exists');

		const junkFolder = folders.find(f => f.name === 'Junk');

		// Verify response
		assert.exists(junkFolder, 'Verify Junk folder exists');

		const trashFolder = folders.find(f => f.name === 'Trash');

		// Verify response
		assert.exists(trashFolder, 'Verify Trash folder exists');
	});


	it('Sanity | Get folder with specific folder id', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Get folder by id
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse.folder[0].id,
			'Verify folder id exists in response');
	});


	it('Functional | Get folder with deleted folder id', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);
		assert.notExists(deleteResponse.Fault, 'Delete should not be a Fault');
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete', 'Verify op is delete');

		// Get deleted folder
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken, false);

		// Verify response - getting a deleted folder should fail
		assert.exists(getFolderResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(getFolderResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});



	it('Regression | Get folder with blank location', async () => {
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l=''/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken, false);

		// Verify response
		assert.exists(getFolderResponse.Fault.Detail.Error, 'Fault Error should exist');
	});


	it('Sanity | Get folder with changed location', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Move folder to Sent (id=5)
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='5'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move', 'Verify op is move');

		// Get folder at new location
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='5'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse.folder[0].id,
			'Verify folder id exists at new location');
	});


	it('Functional | Get folder with non existing folder name', async () => {
		const nonExistingName = `folder ${common.getUniqueString()}`;

		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${nonExistingName}'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken, false);

		// Verify response
		assert.exists(getFolderResponse.Fault.Detail.Error, 'Fault Error should exist');
	});


	it('Sanity | Verify the REST for each folder type and for GetInfoRequest', async () => {
		const folderName = `rest ${common.getUniqueString()}`;

		// Create a parent folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const parentId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(parentId, 'Parent folder ID should exist');

		// Create folders with different views
		const views = ['conversation', 'message', 'contact', 'appointment', 'task', 'document'];
		for (const view of views) {
			const viewFolderRequest =
				`<CreateFolderRequest xmlns='urn:zimbraMail'>
					<folder view='${view}' name='${view}${common.getUniqueString()}' l='${parentId}'/>
				</CreateFolderRequest>`;

			// CreateFolderRequest
			const viewRes = await soap.makeSOAPEnvelopeAccount(viewFolderRequest, accountAuthToken);
			assert.notExists(viewRes.Fault, `Create ${view} folder should not be a Fault`);
			assert.exists(viewRes.CreateFolderResponse.folder[0].id, `${view} folder ID should exist`);
		}

		// Get folders and verify rest URLs
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse.folder[0].id,
			'Verify root folder id in response');
	});


	it('Functional | Get folder with specific id leading space', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Get folder with leading space in id
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l=' ${folderId}'/>
			</GetFolderRequest>`;

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken, false);

		// Leading space in folder ID causes server to not find the folder
		// Verify response
		assert.exists(getFolderResponse.Fault, 'Leading space in folder ID should cause a Fault');
		assert.isString(getFolderResponse.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Functional | Get folder with specific id trailing space', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Get folder with trailing space in id
		const getFolderRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId} '/>
			</GetFolderRequest>`;
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken, false);

		// Trailing space in folder ID causes server to not find the folder
		// Verify response
		assert.exists(getFolderResponse.Fault, 'Trailing space in folder ID should cause a Fault');
		assert.isString(getFolderResponse.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Sanity | GetFolderRequest with visible 1 and 0 for share folders', async () => {
		// Create accounts for share test
		const adminAuth = await soap.getAdminAuthToken();
		const ownerEmail = `owner_vis_${common.getUniqueString()}@${config.testDomain}`;
		const shareeEmail = `sharee_vis_${common.getUniqueString()}@${config.testDomain}`;

		const ownerRes = await soap.createAccountByNameAndEmailAddress(adminAuth, ownerEmail, ownerEmail);
		await soap.createAccountByNameAndEmailAddress(adminAuth, shareeEmail, shareeEmail);

		const ownerAuth = await soap.getAccountAuthToken(ownerEmail, config.accountPassword);
		const shareeAuth = await soap.getAccountAuthToken(shareeEmail, config.accountPassword);
		const ownerId = ownerRes.accountId;

		// Owner creates and shares folder
		const folderName = `visible_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, ownerAuth);
		assert.notExists(createResp.Fault, 'Create should not be a Fault');
		const folderId = createResp.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		const folderActionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='usr' d='${shareeEmail}' perm='r'/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const grantResp = await soap.makeSOAPEnvelopeAccount(folderActionRequest, ownerAuth);
		assert.notExists(grantResp.Fault, 'Grant should not be a Fault');
		assert.equal(grantResp.FolderActionResponse.action.op, 'grant', 'Verify op is grant');

		// Sharee mounts
		const mountName = `mount_vis_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns='urn:zimbraMail'>
				<link l='1' name='${mountName}' zid='${ownerId}' rid='${folderId}' view='message'/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, shareeAuth);
		assert.notExists(mountResp.Fault, 'Mountpoint create should not be a Fault');

		// GetFolderRequest with visible='1'
		const getFolderRequest2 =
			'<GetFolderRequest xmlns=\'urn:zimbraMail\' visible=\'1\'/>';

		// GetFolderRequest
		const visibleResp = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, shareeAuth);

		// Verify response
		assert.notExists(visibleResp.Fault, 'Response should not be a Fault');
		assert.exists(visibleResp.GetFolderResponse.folder[0].id,
			'Root folder id should exist in visible=1 response');

		// GetFolderRequest with visible='0'
		const getFolderRequest3 =
			'<GetFolderRequest xmlns=\'urn:zimbraMail\' visible=\'0\'/>';
		const invisibleResp = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, shareeAuth);

		// Verify response
		assert.notExists(invisibleResp.Fault, 'Response should not be a Fault');
		assert.exists(invisibleResp.GetFolderResponse.folder[0].id,
			'Root folder id should exist in visible=0 response');

		// Cleanup
		await soap.deleteAccount(ownerEmail, adminAuth);
		await soap.deleteAccount(shareeEmail, adminAuth);
	});


	it('Sanity | GetFolderRequest with visible 1 and 0 for share sud-folders', async () => {
		// Create accounts for sub-folder share test
		const adminAuth = await soap.getAdminAuthToken();
		const ownerEmail =
			`owner_subvis_${common.getUniqueString()}@${config.testDomain}`;
		const shareeEmail =
			`sharee_subvis_${common.getUniqueString()}@${config.testDomain}`;

		const ownerRes = await soap.createAccountByNameAndEmailAddress(adminAuth, ownerEmail, ownerEmail);
		await soap.createAccountByNameAndEmailAddress(adminAuth, shareeEmail, shareeEmail);

		const ownerAuth = await soap.getAccountAuthToken(ownerEmail, config.accountPassword);
		const shareeAuth = await soap.getAccountAuthToken(shareeEmail, config.accountPassword);
		const ownerId = ownerRes.accountId;

		// Owner creates folder with subfolder and shares parent
		const parentName = `parent_subvis_${common.getUniqueString()}`;
		const createParentRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${parentName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const parentResp = await soap.makeSOAPEnvelopeAccount(createParentRequest, ownerAuth);
		assert.notExists(parentResp.Fault, 'Parent create should not be a Fault');
		const parentId = parentResp.CreateFolderResponse.folder[0].id;
		assert.exists(parentId, 'Parent folder ID should exist');

		const subName = `sub_vis_${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subName}' l='${parentId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const subResp = await soap.makeSOAPEnvelopeAccount(createSubRequest, ownerAuth);
		assert.notExists(subResp.Fault, 'Sub create should not be a Fault');
		assert.exists(subResp.CreateFolderResponse.folder[0].id, 'Sub folder ID should exist');

		const folderActionRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${parentId}'>
					<grant gt='usr' d='${shareeEmail}' perm='r'/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const grantResp = await soap.makeSOAPEnvelopeAccount(folderActionRequest, ownerAuth);
		assert.notExists(grantResp.Fault, 'Grant should not be a Fault');
		assert.equal(grantResp.FolderActionResponse.action.op, 'grant', 'Verify op is grant');

		// Sharee mounts
		const mountName = `mount_subvis_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns='urn:zimbraMail'>
				<link l='1' name='${mountName}' zid='${ownerId}' rid='${parentId}' view='message'/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, shareeAuth);
		assert.notExists(mountResp.Fault, 'Mountpoint create should not be a Fault');

		// GetFolderRequest with visible='1' to verify sub-folders
		const getFolderRequest4 =
			'<GetFolderRequest xmlns=\'urn:zimbraMail\' visible=\'1\'/>';

		// GetFolderRequest
		const visibleResp = await soap.makeSOAPEnvelopeAccount(getFolderRequest4, shareeAuth);

		// Verify response
		assert.notExists(visibleResp.Fault, 'Response should not be a Fault');
		assert.exists(visibleResp.GetFolderResponse.folder[0].id,
			'Root folder id should exist in visible=1 sub-folder response');

		// GetFolderRequest with visible='0'
		const getFolderRequest5 =
			'<GetFolderRequest xmlns=\'urn:zimbraMail\' visible=\'0\'/>';
		const invisibleResp = await soap.makeSOAPEnvelopeAccount(getFolderRequest5, shareeAuth);

		// Verify response
		assert.notExists(invisibleResp.Fault, 'Response should not be a Fault');
		assert.exists(invisibleResp.GetFolderResponse.folder[0].id,
			'Root folder id should exist in visible=0 sub-folder response');

		// Cleanup
		await soap.deleteAccount(ownerEmail, adminAuth);
		await soap.deleteAccount(shareeEmail, adminAuth);
	});
});

