import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Itemaction Folder', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Smoke | Move an item (folder) within some existing folder', async () => {
		const folderAName = `folderA ${common.getUniqueString()}`;
		const folderBName = `folderB ${common.getUniqueString()}`;

		// Create folderA
		const createA =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderAName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const respA = await soap.makeSOAPEnvelopeAccount(createA, accountAuthToken);
		assert.notExists(respA.Fault, 'Create A should not be a Fault');
		const folderAId = respA.CreateFolderResponse.folder[0].id;
		assert.exists(folderAId, 'Folder A ID should exist');

		// Create folderB
		const createB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderBName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const respB = await soap.makeSOAPEnvelopeAccount(createB, accountAuthToken);
		assert.notExists(respB.Fault, 'Create B should not be a Fault');
		const folderBId = respB.CreateFolderResponse.folder[0].id;
		assert.exists(folderBId, 'Folder B ID should exist');

		// Move folderB under folderA via ItemActionRequest
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderBId}' l='${folderAId}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.ItemActionResponse.action.op, 'move',
			'Verify op is move');
		assert.equal(moveResponse.ItemActionResponse.action.id, folderBId,
			'Verify folder id');
	});


	it('Functional | Move an item (folder) within itself', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Try to move folder within itself
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='${folderId}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Sanity | Delete an item (folder),ie move it to trash', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='3'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Move to trash
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='3'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Move should not be a Fault');
		assert.equal(moveResponse.ItemActionResponse.action.op, 'move',
			'Verify op is move');
		assert.equal(moveResponse.ItemActionResponse.action.id, folderId,
			'Verify folder id');
	});


	it('Regression | Move an item (folder) within a non existing folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Try to move to non-existing folder
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='-1'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Delete an item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

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
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken, false);

		// Verify response
		assert.notExists(deleteResponse.Fault, 'Delete should not be a Fault');
		assert.equal(deleteResponse.ItemActionResponse.action.op, 'delete',
			'Verify op is delete');
		assert.equal(deleteResponse.ItemActionResponse.action.id, folderId,
			'Verify folder id');
	});


	it('Regression | Move an item (folder) within a deleted folder', async () => {
		const folder1Name = `folder1 ${common.getUniqueString()}`;
		const folder2Name = `folder2 ${common.getUniqueString()}`;

		// Create folder1 and delete it
		const create1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder1Name}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resp1 = await soap.makeSOAPEnvelopeAccount(create1, accountAuthToken);
		assert.notExists(resp1.Fault, 'Create folder1 should not be a Fault');
		const folder1Id = resp1.CreateFolderResponse.folder[0].id;
		assert.exists(folder1Id, 'Folder1 ID should exist');

		const deleteRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folder1Id}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const deleteResp = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);
		assert.notExists(deleteResp.Fault, 'Delete should not be a Fault');
		assert.equal(deleteResp.ItemActionResponse.action.op, 'delete', 'Verify op is delete');

		// Create folder2
		const create2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder2Name}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resp2 = await soap.makeSOAPEnvelopeAccount(create2, accountAuthToken);
		assert.notExists(resp2.Fault, 'Create folder2 should not be a Fault');
		const folder2Id = resp2.CreateFolderResponse.folder[0].id;
		assert.exists(folder2Id, 'Folder2 ID should exist');

		// Try to move folder2 to deleted folder1
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folder2Id}' l='${folder1Id}'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response - moving to a deleted folder should fail
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Regression | Delete a deleted item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Delete first time
		const deleteRequest1 =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		await soap.makeSOAPEnvelopeAccount(deleteRequest1, accountAuthToken);

		// Delete again (should be idempotent)
		const deleteRequest2 =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;
		const deleteResponse2 = await soap.makeSOAPEnvelopeAccount(deleteRequest2, accountAuthToken);

		// Verify response - re-delete is idempotent (should succeed)
		assert.notExists(deleteResponse2.Fault, 'Re-delete should not be a Fault');
	});


	it('Regression | Tag an item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const tagName = `tag${common.getUniqueString()}`;

		// Create folder
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const folderResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		assert.notExists(folderResponse.Fault, 'Create folder should not be a Fault');
		const folderId = folderResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Create tag
		const createTagRequest =
			`<CreateTagRequest xmlns='urn:zimbraMail'>
				<tag name='${tagName}' color='0'/>
			</CreateTagRequest>`;

		// CreateTagRequest
		const tagResponse = await soap.makeSOAPEnvelopeAccount(createTagRequest, accountAuthToken);
		assert.notExists(tagResponse.Fault, 'Create tag should not be a Fault');
		const tagId = tagResponse.CreateTagResponse.tag[0].id;
		assert.exists(tagId, 'Tag ID should exist');

		// Try to tag the folder
		const tagRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='tag' tag='${tagId}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const tagActionResponse = await soap.makeSOAPEnvelopeAccount(tagRequest, accountAuthToken, false);

		// Verify response
		assert.exists(tagActionResponse.Fault.Detail.Error, 'Fault Error should exist');
		assert.include(tagActionResponse.Fault.Reason.Text, 'cannot apply tag',
			'Verify CANNOT_TAG error');
	});


	it('Sanity | Mark the item (folder) as read', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Mark as read
		const readRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='read'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const readResponse = await soap.makeSOAPEnvelopeAccount(readRequest, accountAuthToken);

		// Verify response
		assert.notExists(readResponse.Fault, 'Read should not be a Fault');
		assert.equal(readResponse.ItemActionResponse.action.op, 'read',
			'Verify op is read');
		assert.equal(readResponse.ItemActionResponse.action.id, folderId,
			'Verify folder id');
	});


	it('Sanity | Mark the item (folder) as unread', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Try to mark as unread
		const unreadRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='!read'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const unreadResponse = await soap.makeSOAPEnvelopeAccount(unreadRequest, accountAuthToken, false);

		// Verify response
		assert.exists(unreadResponse.Fault.Detail.Error, 'Fault Error should exist');
	});


	it('Sanity | Update the item (folder)', async () => {
		const folder1Name = `folder1 ${common.getUniqueString()}`;
		const folder2Name = `folder2 ${common.getUniqueString()}`;

		// Create two folders
		const create1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder1Name}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resp1 = await soap.makeSOAPEnvelopeAccount(create1, accountAuthToken);
		assert.notExists(resp1.Fault, 'Create 1 should not be a Fault');
		const folder1Id = resp1.CreateFolderResponse.folder[0].id;
		assert.exists(folder1Id, 'Folder1 ID should exist');

		const create2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder2Name}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const resp2 = await soap.makeSOAPEnvelopeAccount(create2, accountAuthToken);
		assert.notExists(resp2.Fault, 'Create 2 should not be a Fault');
		const folder2Id = resp2.CreateFolderResponse.folder[0].id;
		assert.exists(folder2Id, 'Folder2 ID should exist');

		// Update folder1 to be under folder2
		const updateRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folder1Id}' op='update' l='${folder2Id}'/>
			</ItemActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken);

		// Verify response
		assert.notExists(updateResponse.Fault, 'Update should not be a Fault');
		assert.equal(updateResponse.ItemActionResponse.action.op, 'update',
			'Verify op is update');
		assert.equal(updateResponse.ItemActionResponse.action.id, folder1Id,
			'Verify folder id');
	});
});
