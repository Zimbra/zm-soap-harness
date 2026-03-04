import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder Loop', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;
	let rootId;
	let searchFolderId1, searchFolderId2;
	let customFolderId;


	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');

		// Get root folder id
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		rootId = getFolderResponse.GetFolderResponse.folder[0].id;
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
	it('Functional | Creating 500 search folders at root level', async () => {
		this.timeout(300 * 1000);
		const count = 50;

		for (let i = 0; i < count; i++) {
			const createRequest =
				`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
					<search name='search${common.getUniqueString()}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
				</CreateSearchFolderRequest>`;

			// CreateSearchFolderRequest
			const response = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

			// Verify response
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.CreateSearchFolderResponse.search[0].id,
				'Verify search folder created');
		}

		const getInfoRequest = '<GetInfoRequest xmlns=\'urn:zimbraAccount\'/>';

		// GetInfoRequest
		const getInfoResponse = await soap.makeSOAPEnvelopeAccount(getInfoRequest, accountAuthToken);

		// Verify response
		assert.notExists(getInfoResponse.Fault, 'GetInfo should not be a Fault');
		assert.exists(getInfoResponse.GetInfoResponse.name,
			'Verify GetInfoRequest returns account name');

		// Create a custom folder for later use
		const folderName = `Namefolder${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createFolderResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		assert.notExists(createFolderResponse.Fault, 'Create folder should not be a Fault');
		customFolderId = createFolderResponse.CreateFolderResponse.folder[0].id;
		assert.exists(customFolderId, 'Custom folder ID should exist');
	});


	it('Functional | Creating search folders to test various operations', async () => {
		const searchName1 = `Namesearch1${common.getUniqueString()}`;
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName1}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response1 = await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);
		assert.notExists(response1.Fault, 'Create search 1 should not be a Fault');
		searchFolderId1 = response1.CreateSearchFolderResponse.search[0].id;

		// Verify response
		assert.exists(searchFolderId1, 'Verify search folder 1 created');

		const searchName2 = `Namesearch2${common.getUniqueString()}`;
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName2}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken);
		assert.notExists(response2.Fault, 'Create search 2 should not be a Fault');
		searchFolderId2 = response2.CreateSearchFolderResponse.search[0].id;

		// Verify response
		assert.exists(searchFolderId2, 'Verify search folder 2 created');
	});


	it('Functional | Basic test of GetSearchFolderRequest', async () => {
		const getSearchRequest = '<GetSearchFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// GetSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(getSearchRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetSearchFolderResponse.search,
			'Verify search folders returned');
	});


	it('Functional | Creating a duplicate search folder', async () => {
		// Try creating a search folder with same name as searchFolderId1
		const searchName = `DupSearch${common.getUniqueString()}`;
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response1 = await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);
		assert.notExists(response1.Fault, 'First create should not be a Fault');
		assert.exists(response1.CreateSearchFolderResponse.search[0].id, 'First search folder ID should exist');

		// Try duplicate
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken, false);

		// Verify response
		assert.exists(response.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(response.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Create a folder with valid name', async () => {
		const sfName = `SearchRename${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const newName = `SearchRenamed${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${sfId}' name='${newName}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		// Verify response
		assert.notExists(renameResponse.Fault, 'Rename should not be a Fault');
		assert.equal(renameResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(renameResponse.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');
	});


	it('Functional | Rename a folder to duplicate name but with leading spaces', async () => {
		const sfName1 = `SearchA${common.getUniqueString()}`;
		const sfReq1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName1}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		assert.notExists(sfResp1.Fault, 'Create search A should not be a Fault');
		assert.exists(sfResp1.CreateSearchFolderResponse.search[0].id, 'Search A ID should exist');

		const sfName2 = `SearchB${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		assert.notExists(sfResp2.Fault, 'Create search B should not be a Fault');
		const sfId2 = sfResp2.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId2, 'Search B ID should exist');

		// Try renaming sfId2 to sfName1
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${sfId2}' name='${sfName1}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken, false);

		// Verify response
		assert.exists(renameResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(renameResponse.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Moving a search folder to a custom folder', async () => {
		const sfName = `SearchMove${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		// Create a custom folder to move into
		const folderName = `search${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createFolderResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		assert.notExists(createFolderResponse.Fault, 'Create folder should not be a Fault');
		const targetFolderId = createFolderResponse.CreateFolderResponse.folder[0].id;
		assert.exists(targetFolderId, 'Target folder ID should exist');

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId}' l='${targetFolderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Move a search folder to a search folder', async () => {
		const sfName1 = `SearchSrc${common.getUniqueString()}`;
		const sfReq1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName1}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		assert.notExists(sfResp1.Fault, 'Create search src should not be a Fault');
		const sfId1 = sfResp1.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId1, 'Search src ID should exist');

		const sfName2 = `SearchDst${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:sent' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		assert.notExists(sfResp2.Fault, 'Create search dst should not be a Fault');
		const sfId2 = sfResp2.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId2, 'Search dst ID should exist');

		// Move sfId2 into sfId1
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId2}' l='${sfId1}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.id, sfId2,
			'Verify search folder id');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Modify a search folder', async () => {
		const sfName = `SearchModify${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sfId}' query='in:sent'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const modifyResponse = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(modifyResponse.Fault, 'Response should not be a Fault');

		assert.equal(modifyResponse.ModifySearchFolderResponse.search[0].id, sfId,
			'Verify search folder id in modify response');
	});


	it('Functional | Move a parent search folder to its child search folder', async () => {
		const sfName1 = `SearchParent${common.getUniqueString()}`;
		const sfReq1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName1}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		assert.notExists(sfResp1.Fault, 'Create parent should not be a Fault');
		const parentId = sfResp1.CreateSearchFolderResponse.search[0].id;
		assert.exists(parentId, 'Parent search folder ID should exist');

		const sfName2 = `SearchChild${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:sent' types='conversation' sortBy='dateDesc' l='${parentId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		assert.notExists(sfResp2.Fault, 'Create child should not be a Fault');
		const childId = sfResp2.CreateSearchFolderResponse.search[0].id;
		assert.exists(childId, 'Child search folder ID should exist');

		// Try moving parent to child
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${parentId}' l='${childId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Functional | Empty a search folder having child folders', async () => {
		const sfName1 = `SearchEmpty${common.getUniqueString()}`;
		const sfReq1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName1}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		assert.notExists(sfResp1.Fault, 'Create parent should not be a Fault');
		const parentSearchId = sfResp1.CreateSearchFolderResponse.search[0].id;
		assert.exists(parentSearchId, 'Parent search folder ID should exist');

		const sfName2 = `SearchChildEmpty${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:sent' types='conversation' sortBy='dateDesc' l='${parentSearchId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		assert.notExists(sfResp2.Fault, 'Create child should not be a Fault');
		const childSearchId = sfResp2.CreateSearchFolderResponse.search[0].id;
		assert.exists(childSearchId, 'Child search folder ID should exist');

		// Verify child is under parent
		const getSearchRequest1 = '<GetSearchFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// GetSearchFolderRequest
		const getSearchResponse1 = await soap.makeSOAPEnvelopeAccount(getSearchRequest1, accountAuthToken);
		assert.notExists(getSearchResponse1.Fault, 'GetSearch should not be a Fault');
		const childFolder = getSearchResponse1.GetSearchFolderResponse.search.find(s => s.id === childSearchId);

		// Verify response
		assert.equal(childFolder.l, parentSearchId,
			'Verify child folder is under parent');

		// Empty parent search folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${parentSearchId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, accountAuthToken);

		// Verify response
		assert.notExists(emptyResponse.Fault, 'Empty should not be a Fault');
		assert.equal(emptyResponse.FolderActionResponse.action.id, parentSearchId,
			'Verify parent search folder id');
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');

		// Verify child no longer exists and parent still exists
		const getSearchRequest2 = '<GetSearchFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getSearchResponse2 = await soap.makeSOAPEnvelopeAccount(getSearchRequest2, accountAuthToken);

		const childAfterEmpty = getSearchResponse2.GetSearchFolderResponse.search
			? getSearchResponse2.GetSearchFolderResponse.search.find(s => s.id === childSearchId)
			: undefined;

		// Verify response
		assert.notExists(childAfterEmpty, 'Verify child search folder no longer exists');

		const parentAfterEmpty = getSearchResponse2.GetSearchFolderResponse.search
			? getSearchResponse2.GetSearchFolderResponse.search.find(s => s.id === parentSearchId)
			: undefined;

		// Verify response
		assert.exists(parentAfterEmpty, 'Verify parent search folder still exists');
	});


	it('Functional | Delete a search folder', async () => {
		const sfName = `SearchDelete${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='${rootId}'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Verify response
		assert.notExists(deleteResponse.Fault, 'Delete should not be a Fault');
		assert.equal(deleteResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
	});
});
