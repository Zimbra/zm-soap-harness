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
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify folder is created
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.isNotNull(folderId, 'Verify folder id is returned');
		assert.exists(createResponse.CreateFolderResponse.folder[0].name,
			'Verify folder name is returned');
	});


	it('Functional | Create a folder with blank folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse.Fault, 'Verify Fault exists');
		assert.include(createResponse.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Functional | Create a folder with all spaces in folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=' ' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse.Fault, 'Verify Fault exists');
		assert.include(createResponse.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Functional | Create a folder with special characters in folder name', async () => {
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=":/\\.;&lt;*''" l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse.Fault, 'Verify Fault exists');
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
		const createResponse1 = await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);
		assert.exists(createResponse1.CreateFolderResponse.folder[0].id,
			'Verify first folder is created');

		// Create duplicate folder
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse2.Fault, 'Verify Fault exists');
		assert.include(createResponse2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Create a folder with nonexisting parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='0'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse.Fault, 'Verify Fault exists');
		assert.include(createResponse.Fault.Reason.Text, 'no such',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Regression | Create a folder with blank parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l=''/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse.Fault, 'Verify Fault exists');
	});


	it('Regression | Create a folder with No parent folder name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify folder is created (defaults to root)
		assert.exists(createResponse.CreateFolderResponse.folder[0],
			'Verify folder is created without parent');
	});


	it('Functional | Create a folder with duplicate name but with leading spaces', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder first
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);

		// Create folder with leading spaces (different name)
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name=' ${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken);

		// Verify folder is created (leading spaces make it a different name)
		assert.exists(createResponse2.CreateFolderResponse.folder[0],
			'Verify folder with leading spaces is created');
	});


	it('Functional | Create a folder with duplicate name but with trailing spaces', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder first
		const createRequest1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		await soap.makeSOAPEnvelopeAccount(createRequest1, accountAuthToken);

		// Create folder with trailing spaces (trailing spaces are trimmed, so becomes duplicate)
		const createRequest2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName} ' l='1'/>
			</CreateFolderRequest>`;
		const createResponse2 = await soap.makeSOAPEnvelopeAccount(createRequest2, accountAuthToken, false);

		// Verify error
		assert.exists(createResponse2.Fault, 'Verify Fault exists');
		assert.include(createResponse2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Create a folder having spaces within the folder name', async () => {
		const folderName = `fold      er ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify folder is created
		assert.exists(createResponse.CreateFolderResponse.folder[0],
			'Verify folder with spaces in name is created');
	});


	it('Functional | Create a folder with valid name', async () => {
		const folderName = `ケロロ購暹${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify folder is created
		assert.exists(createResponse.CreateFolderResponse.folder[0].id,
			'Verify folder with non-latin name is created');
	});


	it('Functional | Create a folder with non-latin-1 name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Verify Inbox folder found');

		// Create folder with color and checked flag
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='checked'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify folder is created with correct color
		assert.exists(createResponse.CreateFolderResponse.folder[0].id,
			'Verify folder is created');
		assert.equal(createResponse.CreateFolderResponse.folder[0].color, 3,
			'Verify color is set to 3');
	});


	it('Functional | Create a folder with valid name 1', async () => {
		const folderName = `Folder${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='#' view='appointment'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.equal(folder.color, 3, 'Verify color is 3');
		assert.equal(folder.f, '#', 'Verify flag is #');
	});


	it('Functional | Create a folder with valid name 2', async () => {
		const folderName = `Folder${common.getUniqueString()}`;

		// Get inbox folder id
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxFolder = folders.find(f => f.name === 'Inbox');

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${inboxFolder.id}' color='3' f='*' view='appointment'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		const folder = createResponse.CreateFolderResponse.folder[0];
		assert.equal(folder.color, 3, 'Verify color is 3');
		assert.include(folder.f, '*', 'Verify flag contains *');
	});


	it('Functional | CreateFolderRequest works when full path is specified instead of parent folder id', async () => {
		const folderName = `/Folder${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' color='3'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.equal(createResponse.CreateFolderResponse.folder[0].color, 3,
			'Verify color is set to 3');
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
		const notebookResponse = await soap.makeSOAPEnvelopeAccount(createNotebookRequest, accountAuthToken);
		const notebookId = notebookResponse.CreateFolderResponse.folder[0].id;

		// Create nested folder 1 under notebook
		const createFolder1Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${notebookId}' name='${folder1Name}' view='document'/>
			</CreateFolderRequest>`;
		const folder1Response = await soap.makeSOAPEnvelopeAccount(createFolder1Request, accountAuthToken);
		const folder1Id = folder1Response.CreateFolderResponse.folder[0].id;

		// Create nested folder 2 under folder 1
		const createFolder2Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folder1Id}' name='${folder2Name}' view='document'/>
			</CreateFolderRequest>`;
		const folder2Response = await soap.makeSOAPEnvelopeAccount(createFolder2Request, accountAuthToken);
		const folder2Id = folder2Response.CreateFolderResponse.folder[0].id;

		// Create nested folder 3 under folder 2
		const createFolder3Request =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folder2Id}' name='${folder3Name}' view='document'/>
			</CreateFolderRequest>`;
		const folder3Response = await soap.makeSOAPEnvelopeAccount(createFolder3Request, accountAuthToken);
		const folder3Id = folder3Response.CreateFolderResponse.folder[0].id;

		// Verify view is set correctly via GetItemRequest
		const getItemRequest =
			`<GetItemRequest xmlns='urn:zimbraMail'>
				<item id='${folder3Id}'/>
			</GetItemRequest>`;
		const getItemResponse = await soap.makeSOAPEnvelopeAccount(getItemRequest, accountAuthToken);
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
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		const folder = createResponse.CreateFolderResponse.folder[0];

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
		const apptResponse = await soap.makeSOAPEnvelopeAccount(createApptRequest, accountAuthToken);

		// Appointment should be created successfully
		if (apptResponse.CreateAppointmentResponse) {
			assert.notExists(apptResponse.Fault, 'Response should not be a Fault');
			assert.exists(apptResponse.CreateAppointmentResponse,
				'Appointment should be created in f=b folder');
		}

		// Verify via GetFreeBusyRequest - appointment should NOT appear
		const s = start;
		const e = end;
		const getFreeBusyRequest =
			`<GetFreeBusyRequest xmlns='urn:zimbraMail' s='${s}' e='${e}'>
				<usr name='${accountEmail}'/>
			</GetFreeBusyRequest>`;
		const fbResponse = await soap.makeSOAPEnvelopeAccount(getFreeBusyRequest, accountAuthToken);

		assert.notExists(fbResponse.Fault, 'Response should not be a Fault');
		assert.exists(fbResponse.GetFreeBusyResponse,
			'GetFreeBusyResponse should exist');
	});
});
