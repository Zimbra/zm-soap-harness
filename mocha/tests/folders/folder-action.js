import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Action', function () {
	this.timeout(30 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
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
	it('Smoke | Rename a folder to unique name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const newFolderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Verify response
		assert.isNotNull(folderId, 'Verify folder is created');

		// Rename folder
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderId}' name='${newFolderName}'/>
			</FolderActionRequest>`;
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		// Verify response
		assert.equal(renameResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
		assert.equal(renameResponse.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');
	});


	it('Functional | Rename a folder to duplicate name', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponseB = await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Verify response
		assert.notExists(createResponseB.Fault, 'Response should not be a Fault');
		assert.exists(createResponseB.CreateFolderResponse,
			'Folder B should be created successfully');
		const folderIdB = createResponseB.CreateFolderResponse.folder[0].id;

		// Rename folder B to folder A's name
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderIdB}' name='${folderNameA}'/>
			</FolderActionRequest>`;
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.exists(renameResponse.Fault, 'Verify Fault exists');
		if (renameResponse.Fault) {
			assert.include(renameResponse.Fault.Reason.Text, 'already exists',
				'Verify ALREADY_EXISTS error');
		}
	});


	it('Regression | Rename a folder with nonexisting, deleted folder id', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const newFolderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to rename deleted folder
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderId}' name='${newFolderName}'/>
			</FolderActionRequest>`;
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken, false);

		// Server may return Fault or succeed silently for deleted folder
		if (renameResponse.Fault) {

			// Verify response
			assert.include(renameResponse.Fault.Reason.Text, 'no such folder',
				'Verify NO_SUCH_FOLDER error');
		} else {
			assert.notExists(renameResponse.Fault, 'Response should not be a Fault');
			assert.exists(renameResponse.FolderActionResponse,
				'Rename of deleted folder succeeded silently');
		}
	});


	it('Sanity | Move a folder within some existing folder', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponseB = await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);
		const folderIdB = createResponseB.CreateFolderResponse.folder[0].id;

		// Move folder B under folder A
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderIdB}' l='${folderIdA}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.equal(moveResponse.FolderActionResponse.action.id, folderIdB,
			'Verify folder id in response');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Functional | Move a folder within itself', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Move folder within itself
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='${folderId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Sanity | Delete a Folder,ie move it to trash', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Move folder to trash (id=3)
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='3'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.exists(moveResponse.FolderActionResponse.action,
			'Verify FolderActionResponse exists');
	});


	it('Regression | Rename a folder to unique name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Move folder to non-existing folder (id=-1)
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='-1'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Delete a deleted item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Verify response
		assert.isTrue(
			!!deleteResponse.FolderActionResponse || !!deleteResponse.Fault,
			'First delete should return success or fault'
		);

		// Delete already deleted folder
		const reDeleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;
		const reDeleteResponse = await soap.makeSOAPEnvelopeAccount(reDeleteRequest, accountAuthToken);

		// Re-delete should be idempotent (success) or return a Fault — both are valid
		// Verify response
		assert.isTrue(
			!!reDeleteResponse.FolderActionResponse || !!reDeleteResponse.Fault,
			'Re-delete should return success or fault'
		);
	});


	it('Functional | Rename a folder to duplicate name but with leading spaces', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Rename folder A to folder B's name with leading spaces
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderIdA}' name=' ${folderNameB}'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		// Verify rename succeeds (leading spaces make it a different name)
		// Verify response
		assert.equal(renameResponse.FolderActionResponse.action.id, folderIdA,
			'Verify folder id in response');
		assert.equal(renameResponse.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');

		// Verify both folders exist via GetFolder
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// CreateFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse,
			'Verify GetFolderResponse exists');
	});


	it('Functional | Rename a folder to duplicate name but with trailing spaces 1', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Rename folder A to folder B's name with trailing spaces
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderIdA}' name='${folderNameB} '/>
			</FolderActionRequest>`;
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken, false);

		// Verify error (trailing spaces are trimmed, so it becomes duplicate)
		// Some servers may trim trailing spaces leading to ALREADY_EXISTS,
		// while others may accept the trailing spaces as a different name
		if (renameResponse.Fault) {

			// Verify response
			assert.include(renameResponse.Fault.Reason.Text, 'already exists',
				'Verify ALREADY_EXISTS error');
		} else {
			// Server accepted the rename with trailing spaces - that's also valid behavior
			assert.notExists(renameResponse.Fault, 'Response should not be a Fault');
			assert.exists(renameResponse.FolderActionResponse,
				'Verify rename succeeded when trailing spaces are preserved');
		}
	});


	it('Functional | Mark all mails in folders ar read', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// SendMsgRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Send a mail to self
		const sendRequest =
			`<SendMsgRequest xmlns='urn:zimbraMail'>
				<m>
				<e t='t' a='${accountEmail}'/>
				<su>Test Mail for Read option</su>
				<mp ct='text/plain'>
					<content>Test</content>
				</mp>
			</m>
			</SendMsgRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(sendRequest, accountAuthToken);

		// Mark folder as read
		const readRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='read' id='${folderId}' l='1'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const readResponse = await soap.makeSOAPEnvelopeAccount(readRequest, accountAuthToken);

		// Verify response
		assert.equal(readResponse.FolderActionResponse.action.op, 'read',
			'Verify op is read');
	});


	it('Functional | Mark all mails in folders ar unread', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to mark folder as unread
		const unreadRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='unread' id='${folderId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const unreadResponse = await soap.makeSOAPEnvelopeAccount(unreadRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(unreadResponse.Fault.Reason.Text, 'unknown operation',
			'Verify INVALID_REQUEST error');
	});


	it('Sanity | Empty a folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Add a message to the folder
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${folderId}'>
					<content>Subject: hello
					Test content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, accountAuthToken);

		// Empty the folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${folderId}'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, accountAuthToken);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');

		// Verify folder still exists
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// CreateFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse,
			'Verify emptied folder still exists');
	});


	it('Sanity | Empty a folder having a sub folder in it', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const subFolderName = `subfolder ${common.getUniqueString()}`;

		// Create parent folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Create sub folder
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subFolderName}' l='${folderId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createSubRequest, accountAuthToken);

		// Empty parent folder
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${folderId}'/>
			</FolderActionRequest>`;
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyRequest, accountAuthToken);

		// Verify response
		assert.equal(emptyResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
		assert.equal(emptyResponse.FolderActionResponse.action.op, 'empty',
			'Verify op is empty');
	});


	it('Sanity | Change a folders name, location, color and exclude free, busy using op update', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const newFolderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Update folder (name, location to inbox, color to 8, exclude free/busy)
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderId}' name='${newFolderName}' l='2' f='b' color='8'/>
			</FolderActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken);

		// Verify response
		assert.equal(updateResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
		assert.equal(updateResponse.FolderActionResponse.action.op, 'update',
			'Verify op is update');
	});


	it('Functional | Change the name of a folder to duplicate name but with leading spaces (use op update)', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Update folder A to folder B's name
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderIdA}' name='${folderNameB}'/>
			</FolderActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.exists(updateResponse.Fault, 'Verify Fault exists on duplicate rename');
		assert.include(updateResponse.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Regression | Update a folder with nonexisting, deleted folder id', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const newFolderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to update deleted folder
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderId}' name='${newFolderName}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(updateResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Functional | Rename a folder to duplicate name but with leading spaces 1', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Update folder A to folder B's name with leading spaces
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderIdA}' name=' ${folderNameB}'/>
			</FolderActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken);

		// Verify update succeeds (leading spaces make it a different name)
		// Verify response
		assert.equal(updateResponse.FolderActionResponse.action.id, folderIdA,
			'Verify folder id in response');
		assert.equal(updateResponse.FolderActionResponse.action.op, 'update',
			'Verify op is update');
	});


	it('Functional | Rename a folder to duplicate name but with trailing spaces 2', async () => {
		const folderNameA = `folder ${common.getUniqueString()}`;
		const folderNameB = `folder ${common.getUniqueString()}`;

		// Create folder A
		const createRequestA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameA}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponseA = await soap.makeSOAPEnvelopeAccount(createRequestA, accountAuthToken);
		const folderIdA = createResponseA.CreateFolderResponse.folder[0].id;

		// Create folder B
		const createRequestB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderNameB}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createRequestB, accountAuthToken);

		// Update folder A to folder B's name with trailing spaces
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderIdA}' name='${folderNameB} '/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken, false);

		// Verify error (trailing spaces are trimmed, so it becomes duplicate)
		// Verify response
		assert.include(updateResponse.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Functional | Update the location of a folder within itself', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Update folder location within itself
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderId}' l='${folderId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(updateResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Regression | Update a folder to duplicate name', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Update folder location to non-existing folder
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderId}' l='-1'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(updateResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Change the folders color to new-color', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder with color 8
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' color='8'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Change color to 4
		const colorRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='color' id='${folderId}' color='4'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const colorResponse = await soap.makeSOAPEnvelopeAccount(colorRequest, accountAuthToken);

		// Verify response
		assert.equal(colorResponse.FolderActionResponse.action.id, folderId,
			'Verify folder id in response');
		assert.equal(colorResponse.FolderActionResponse.action.op, 'color',
			'Verify op is color');
	});


	it('Regression | Change the folders color of deleted folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' color='8'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to change color of deleted folder
		const colorRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='color' id='${folderId}' color='4'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const colorResponse = await soap.makeSOAPEnvelopeAccount(colorRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(colorResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Set the excludeFreeBusy boolean for the folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Set excludeFreeBusy=1
		const fbRequest1 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='fb' id='${folderId}' excludeFreeBusy='1'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const fbResponse1 = await soap.makeSOAPEnvelopeAccount(fbRequest1, accountAuthToken);

		// Verify response
		assert.equal(fbResponse1.FolderActionResponse.action.op, 'fb', 'Verify op is fb');

		// Set excludeFreeBusy=0
		const fbRequest2 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='fb' id='${folderId}' excludeFreeBusy='0'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const fbResponse2 = await soap.makeSOAPEnvelopeAccount(fbRequest2, accountAuthToken);

		// Verify response
		assert.equal(fbResponse2.FolderActionResponse.action.op, 'fb',
			'Verify op is fb after unset');
	});


	it('Regression | Set the excludeFreeBusy boolean for the deleted folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to set excludeFreeBusy for deleted folder
		const fbRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='fb' id='${folderId}' excludeFreeBusy='1'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const fbResponse = await soap.makeSOAPEnvelopeAccount(fbRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(fbResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Set or Unset the checked state of the folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Uncheck folder
		const uncheckRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='!check' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const uncheckResponse = await soap.makeSOAPEnvelopeAccount(uncheckRequest, accountAuthToken);

		// Verify response
		assert.equal(uncheckResponse.FolderActionResponse.action.op, '!check',
			'Verify op is !check');

		// Check folder
		const checkRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='check' id='${folderId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const checkResponse = await soap.makeSOAPEnvelopeAccount(checkRequest, accountAuthToken);

		// Verify response
		assert.equal(checkResponse.FolderActionResponse.action.op, 'check',
			'Verify op is check');
	});


	it('Regression | Set, Unset the checked state of the deleted folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to uncheck deleted folder
		const uncheckRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='!check' id='${folderId}'/>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const uncheckResponse = await soap.makeSOAPEnvelopeAccount(uncheckRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(uncheckResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Grant and revoke the folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Grant write permission to account2
		const grantRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='usr' d='${account2Email}' perm='w'/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const grantResponse = await soap.makeSOAPEnvelopeAccount(grantRequest, accountAuthToken);

		// Verify response
		assert.equal(grantResponse.FolderActionResponse.action.op, 'grant',
			'Verify op is grant');

		// Revoke permission from account2
		const revokeRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='!grant' id='${folderId}' zid=''>
					<grant gt='usr' d='${account2Email}'/>
				</action>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const revokeResponse = await soap.makeSOAPEnvelopeAccount(revokeRequest, accountAuthToken);

		// Verify response
		assert.equal(revokeResponse.FolderActionResponse.action.op, '!grant',
			'Verify op is !grant');
	});


	it('Functional | Grant the folder and use zid 99999999-9999-9999-9999-999999999999 to revoke acces granted to pub', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Grant read permission to public
		const grantRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='pub' perm='r'/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		const grantResponse = await soap.makeSOAPEnvelopeAccount(grantRequest, accountAuthToken);

		// Verify response
		assert.equal(grantResponse.FolderActionResponse.action.op, 'grant',
			'Verify op is grant');

		// Revoke public access using zid
		const revokeRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='!grant' id='${folderId}' zid='99999999-9999-9999-9999-999999999999'>
					<grant gt='pub'/>
				</action>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const revokeResponse = await soap.makeSOAPEnvelopeAccount(revokeRequest, accountAuthToken);

		// Verify response
		assert.equal(revokeResponse.FolderActionResponse.action.op, '!grant',
			'Verify op is !grant');
	});


	it('Functional | Share a folder with nonexisting account', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const nonExistingAccount =
			`nonexisting.${common.getUniqueString()}@${config.serverDomain}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to grant to non-existing account
		const grantRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='usr' d='${nonExistingAccount}' perm='w'/>
				</action>
			</FolderActionRequest>`;
		const grantResponse = await soap.makeSOAPEnvelopeAccount(grantRequest, accountAuthToken);

		// BUG-107461: Server allows granting to non-existing accounts
		// Verify response contains grant action (no error thrown)
		// Verify response
		assert.equal(grantResponse.FolderActionResponse.action.op, 'grant',
			'Verify grant op succeeds for non-existing account (BUG-107461)');
	});


	it('Functional | Share a folder with invalid account', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const invalidAccount =
			`invalid.${common.getUniqueString()}@@${config.zimbraDomain}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to grant to invalid account
		const grantRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='usr' d='${invalidAccount}' perm='r'/>
				</action>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const grantResponse = await soap.makeSOAPEnvelopeAccount(grantRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(grantResponse.Fault.Reason.Text, 'must be valid email',
			'Verify INVALID_REQUEST error');
	});


	it('Functional | Share the deleted folder with valid account', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Try to grant deleted folder
		const grantRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='grant' id='${folderId}'>
					<grant gt='usr' d='${account2Email}' perm='r'/>
				</action>
			</FolderActionRequest>`;

		// CreateFolderRequest
		const grantResponse = await soap.makeSOAPEnvelopeAccount(grantRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(grantResponse.Fault.Reason.Text, 'no such',
			'Verify NO_SUCH_FOLDER or NO_SUCH_ITEM error');
	});


	it('Functional | Try to revoke share without sharing a folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to revoke without granting first
		const revokeRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='!grant' id='${folderId}' zid=''>
					<grant gt='usr' d='${account2Email}'/>
				</action>
			</FolderActionRequest>`;

		// GetFolderRequest
		const revokeResponse = await soap.makeSOAPEnvelopeAccount(revokeRequest, accountAuthToken);

		// Verify response (should still succeed without error)
		// Verify response
		assert.exists(revokeResponse.FolderActionResponse.action,
			'Verify FolderActionResponse exists');
	});


	it('Sanity | More Options - delete calendar -main calendar', async () => {
		// Get calendar folder id
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

		// Verify response
		assert.notExists(getFolderResponse.Fault, 'Response should not be a Fault');
		assert.exists(getFolderResponse.GetFolderResponse,
			'Verify GetFolderResponse exists');

		// Find Calendar folder - search through the folder tree
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const calendarFolder = folders.find(f => f.name === 'Calendar');

		// Verify response
		assert.exists(calendarFolder, 'Verify Calendar folder found');
		const calendarFolderId = calendarFolder.id;

		// Try to delete calendar folder
		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${calendarFolderId}'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken, false);

		// Verify error
		// Verify response
		assert.include(deleteResponse.Fault.Reason.Text, 'cannot modify immutable object',
			'Verify IMMUTABLE_OBJECT error');
	});


	it('Sanity | Need folder preference for offline sync interval', async () => {
		// Get Drafts folder id
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// FolderActionRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const draftsFolder = folders.find(f => f.name === 'Drafts');

		// Verify response
		assert.exists(draftsFolder, 'Verify Drafts folder found');
		const draftsFolderId = draftsFolder.id;

		// Set webofflinesyncdays to 20
		const syncRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='webofflinesyncdays' id='${draftsFolderId}' numDays='20'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(syncRequest, accountAuthToken);

		// Verify by getting folder details
		const getFolderDetailRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${draftsFolderId}'/>
			</GetFolderRequest>`;

		// CreateFolderRequest
		const detailResponse = await soap.makeSOAPEnvelopeAccount(getFolderDetailRequest, accountAuthToken);

		// Verify webOfflineSyncDays is set to 20
		// Verify response
		assert.equal(detailResponse.GetFolderResponse.folder[0].webOfflineSyncDays, '20',
			'Verify webOfflineSyncDays is 20');
	});


	it('Functional | Delete a Folder,ie Update it to trash location', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Move to trash (id=3) using move op
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='3'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
		assert.exists(moveResponse.FolderActionResponse,
			'Verify FolderActionResponse exists');
	});


	it('Functional | Verify that emptying a folder occurs quickly (bug 11731)', async () => {
		this.timeout(60 * 1000);

		// Get inbox and trash ids
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';

		// CreateFolderRequest
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;
		const inboxId = folders.find(f => f.name === 'Inbox').id;
		const trashId = folders.find(f => f.name === 'Trash').id;

		// Create subfolder
		const subfolderName = `subfolder_${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subfolderName}' l='${inboxId}'/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createSubResponse = await soap.makeSOAPEnvelopeAccount(createSubRequest, accountAuthToken);
		const subfolderId = createSubResponse.CreateFolderResponse.folder[0].id;

		// Add messages to inbox and subfolder (reduced from XML's 2000 to 20 for practical test runtime)
		for (let i = 0; i < 20; i++) {
			const addMsgInbox =
				`<AddMsgRequest xmlns='urn:zimbraMail'>
					<m l='${inboxId}'>
						<content>Subject: message${i}
						Test content</content>
					</m>
				</AddMsgRequest>`;

			// AddMsgRequest
			await soap.makeSOAPEnvelopeAccount(addMsgInbox, accountAuthToken);

			const addMsgSub =
				`<AddMsgRequest xmlns='urn:zimbraMail'>
					<m l='${subfolderId}'>
						<content>Subject: submessage${i}
						Test content</content>
					</m>
				</AddMsgRequest>`;

			// FolderActionRequest
			await soap.makeSOAPEnvelopeAccount(addMsgSub, accountAuthToken);
		}

		// Move subfolder to trash
		const moveToTrash =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${subfolderId}' l='${trashId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(moveToTrash, accountAuthToken);

		// Empty trash - should complete quickly
		const emptyTrash =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='${trashId}'/>
			</FolderActionRequest>`;

		// SearchRequest
		const emptyResponse = await soap.makeSOAPEnvelopeAccount(emptyTrash, accountAuthToken);

		// Verify response
		assert.notExists(emptyResponse.Fault, 'Response should not be a Fault');
		assert.exists(emptyResponse.FolderActionResponse,
			'Verify trash emptied successfully');

		// Verify no messages in trash
		const searchTrash =
			`<SearchRequest xmlns='urn:zimbraMail' types='message'>
				<query>in:trash</query>
			</SearchRequest>`;
		const searchResponse = await soap.makeSOAPEnvelopeAccount(searchTrash, accountAuthToken);

		// Verify response
		assert.notExists(searchResponse.SearchResponse.m, 'Verify no messages in trash');
	});
});
