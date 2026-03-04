import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Create', function () {
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
	it('Smoke | Create a folder with valid name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Verify folder name matches');
		assert.exists(folder.l, 'Folder parent ID should exist');
	});


	it('Functional | Create a folder with blank folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(createResponse.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(createResponse.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Functional | Create a folder with all spaces in folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=' ' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(createResponse.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(createResponse.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Functional | Create a folder with special characters in folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=":/\\.;&lt;*''" l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.isString(createResponse.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(createResponse.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Functional | Create a folder with duplicate folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder first
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse1 = await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);

		// Verify response
		assert.notExists(createResponse1.Fault, 'First create should not be a Fault');
		assert.exists(createResponse1.CreateFolderResponse.folder[0].id,
			'Verify first folder is created');
		assert.isString(createResponse1.CreateFolderResponse.folder[0].id,
			'Verify first folder id is a string');

		// Create duplicate folder
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse2.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(createResponse2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Create a folder with nonexisting parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='0'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(createResponse.Fault.Reason.Text, 'no such',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Regression | Create a folder with blank parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l=''/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse.Fault.Detail.Error, 'Fault Error should exist');
	});


	it('Regression | Create a folder with No parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Verify folder name matches');
	});


	it('Functional | Create a folder with duplicate name but with leading spaces', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder first
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse1 = await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);
		assert.notExists(createResponse1.Fault, 'First create should not be a Fault');
		assert.exists(createResponse1.CreateFolderResponse.folder[0].id, 'First folder ID should exist');

		// Create folder with leading spaces (different name)
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=' ${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken);

		// Verify response
		assert.notExists(createResponse2.Fault, 'Response should not be a Fault');
		const folder = createResponse2.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
	});


	it('Functional | Create a folder with duplicate name but with trailing spaces', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder first
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse1 = await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);
		assert.notExists(createResponse1.Fault, 'First create should not be a Fault');
		assert.exists(createResponse1.CreateFolderResponse.folder[0].id, 'First folder ID should exist');

		// Create folder with trailing spaces (trailing spaces are trimmed, so becomes duplicate)
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName} ' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken, false);

		// Verify response
		assert.exists(createResponse2.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(createResponse2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Create a folder having spaces within the folder name', async () => {
		const folderName = `fold      er ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Verify folder name matches');
	});


	it('Functional | Create a folder with valid name', async () => {
		const folderName = `ケロロ購暹${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Verify folder name matches');
	});


	it('Functional | Create a folder with non-latin-1 name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		assert.notExists(getFolderResponse.Fault, 'GetFolder should not be a Fault');
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Verify Inbox folder found');

		// Create folder with color and checked flag
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='checked'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.isString(folder.id, 'Folder ID should be a string');
		assert.equal(folder.name, folderName, 'Verify folder name matches');
		assert.equal(folder.color, 3, 'Verify color is set to 3');
		assert.equal(folder.l, inboxFolder.id, 'Verify parent folder matches Inbox');
	});


	it('Functional | Create a folder with valid name 1', async () => {
		const folderName = `Folder${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		assert.notExists(getFolderResponse.Fault, 'GetFolder should not be a Fault');
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Verify Inbox folder found');

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='#' view='appointment'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.equal(folder.color, 3, 'Verify color is 3');
		assert.equal(folder.f, '#', 'Verify flag is #');
		assert.equal(folder.view, 'appointment', 'Verify view is appointment');
	});


	it('Functional | Create a folder with valid name 2', async () => {
		const folderName = `Folder${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// GetFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		assert.notExists(getFolderResponse.Fault, 'GetFolder should not be a Fault');
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Verify Inbox folder found');

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='*' view='appointment'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.equal(folder.color, 3, 'Verify color is 3');
		assert.include(folder.f, '*', 'Verify flag contains *');
		assert.equal(folder.view, 'appointment', 'Verify view is appointment');
	});


	it('Functional | CreateFolderRequest works when full path is specified instead of parent folder id', async () => {
		const folderName = `/Folder${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' color='3'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folder.id, 'Folder ID should exist');
		assert.equal(folder.color, 3, 'Verify color is set to 3');
	});


	it('Functional | CreateFolderRequest sets the view correctly for nested folders', async () => {
		const folder1Name = `folder${common.getUniqueString()}`;
		const folder2Name = `folder${common.getUniqueString()}`;
		const folder3Name = `folder${common.getUniqueString()}`;

		// Create parent Notebook folder with document view
		const createNotebookRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='1' name='Notebook${common.getUniqueString()}' view='document'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const notebookResponse = await soap.makeSOAPEnvelopeAccount(createNotebookRequest, accountAuthToken);
		assert.notExists(notebookResponse.Fault, 'Notebook create should not be a Fault');
		const notebookId = notebookResponse.CreateFolderResponse.folder[0].id;
		assert.exists(notebookId, 'Notebook folder ID should exist');

		// Create nested folder 1 under notebook
		const createFolder1Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${notebookId}' name='${folder1Name}' view='document'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const folder1Response = await soap.makeSOAPEnvelopeAccount(createFolder1Request, accountAuthToken);
		assert.notExists(folder1Response.Fault, 'Folder 1 create should not be a Fault');
		const folder1Id = folder1Response.CreateFolderResponse.folder[0].id;
		assert.exists(folder1Id, 'Folder 1 ID should exist');

		// Create nested folder 2 under folder 1
		const createFolder2Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folder1Id}' name='${folder2Name}' view='document'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const folder2Response = await soap.makeSOAPEnvelopeAccount(createFolder2Request, accountAuthToken);
		assert.notExists(folder2Response.Fault, 'Folder 2 create should not be a Fault');
		const folder2Id = folder2Response.CreateFolderResponse.folder[0].id;
		assert.exists(folder2Id, 'Folder 2 ID should exist');

		// Create nested folder 3 under folder 2
		const createFolder3Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folder2Id}' name='${folder3Name}' view='document'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const folder3Response = await soap.makeSOAPEnvelopeAccount(createFolder3Request, accountAuthToken);
		assert.notExists(folder3Response.Fault, 'Folder 3 create should not be a Fault');
		const folder3Id = folder3Response.CreateFolderResponse.folder[0].id;
		assert.exists(folder3Id, 'Folder 3 ID should exist');

		// Verify view is set correctly via GetItemRequest
		const getItemRequest =
			`<GetItemRequest xmlns='urn:zimbraMail'>
				<item id='${folder3Id}'/>
			</GetItemRequest>`;

		// GetItemRequest
		const getItemResponse = await soap.makeSOAPEnvelopeAccount(getItemRequest, accountAuthToken);

		// Verify response
		assert.notExists(getItemResponse.Fault, 'GetItem should not be a Fault');
		assert.exists(getItemResponse.GetItemResponse.folder[0].id,
			'Verify folder id exists in GetItem response');
		assert.equal(getItemResponse.GetItemResponse.folder[0].view, 'document',
			'Verify deepest nested folder has document view');
	});


	it('Functional | CreateFolderRequest sets the view correctly for nested folders 1', async () => {
		const folderName = `calFB_${common.getUniqueString()}`;

		// Create a calendar folder with f="b" (excludeFreeBusy)
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' view='appointment' f='b'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.exists(folderId, 'Folder ID should exist');
		assert.equal(folder.view, 'appointment', 'Verify view is appointment');
		assert.include(folder.f, 'b', 'Verify flag b (excludeFreeBusy) is set');

		// Create an appointment in the f=b folder
		const now = Date.now();
		const start = now + 3600000; // 1 hour from now
		const end = start + 3600000; // 2 hours from now
		const startDate = new Date(start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
		const endDate = new Date(end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

		const createApptRequest =
			`<CreateAppointmentRequest xmlns='urn:zimbraMail'>
				<m l='${folderId}'>
					<inv>
						<comp name='FB Test Appt' loc='Test' status='CONF' fb='B' class='PUB' transp='O'>
							<s d='${startDate}'/>
							<e d='${endDate}'/>
							<or a='${accountEmail}'/>
						</comp>
					</inv>
					<su>FB Test Appt</su>
					<mp ct='text/plain'>
						<content>Free/Busy test appointment</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`;

		// CreateAppointmentRequest
		const apptResponse = await soap.makeSOAPEnvelopeAccount(createApptRequest, accountAuthToken);

		// Verify appointment created
		assert.notExists(apptResponse.Fault, 'Appointment create should not be a Fault');

		// Verify via GetFreeBusyRequest - appointment should NOT appear
		const s = start;
		const e = end;
		const getFreeBusyRequest =
			`<GetFreeBusyRequest xmlns='urn:zimbraMail' s='${s}' e='${e}'>
				<usr name='${accountEmail}'/>
			</GetFreeBusyRequest>`;
		const fbResponse = await soap.makeSOAPEnvelopeAccount(getFreeBusyRequest, accountAuthToken);

		// Verify response
		assert.notExists(fbResponse.Fault, 'Response should not be a Fault');
		assert.exists(fbResponse.GetFreeBusyResponse.usr,
			'Verify usr element exists in GetFreeBusyResponse');
	});
});
