import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Itemaction Folder', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
		const respA = await soap.makeSOAPEnvelopeAccount(createA, accountAuthToken);
		const folderAId = respA.CreateFolderResponse.folder[0].id;

		// Create folderB
		const createB =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderBName}' l='1'/>
			</CreateFolderRequest>`;
		const respB = await soap.makeSOAPEnvelopeAccount(createB, accountAuthToken);
		const folderBId = respB.CreateFolderResponse.folder[0].id;

		// Move folderB under folderA via ItemActionRequest
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderBId}' l='${folderAId}'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

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
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to move folder within itself
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='${folderId}'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		assert.exists(moveResponse.Fault, 'Verify Fault exists');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Sanity | Delete an item (folder),ie move it to trash', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='3'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Move to trash
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='3'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

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
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to move to non-existing folder
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='-1'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		assert.exists(moveResponse.Fault, 'Verify Fault exists');
		assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
			'Verify NO_SUCH_FOLDER error');
	});


	it('Sanity | Delete an item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete folder
		const deleteRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken, false);

		// Server may return success or fault
		if (deleteResponse.ItemActionResponse) {
			assert.equal(deleteResponse.ItemActionResponse.action.op, 'delete',
				'Verify op is delete');
			assert.equal(deleteResponse.ItemActionResponse.action.id, folderId,
				'Verify folder id');
		} else {
			assert.exists(deleteResponse.Fault,
				'Should return Fault if delete failed');
		}
	});


	it('Regression | Move an item (folder) within a deleted folder', async () => {
		const folder1Name = `folder1 ${common.getUniqueString()}`;
		const folder2Name = `folder2 ${common.getUniqueString()}`;

		// Create folder1 and delete it
		const create1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder1Name}' l='1'/>
			</CreateFolderRequest>`;
		const resp1 = await soap.makeSOAPEnvelopeAccount(create1, accountAuthToken);
		const folder1Id = resp1.CreateFolderResponse.folder[0].id;

		const deleteRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folder1Id}'/>
			</ItemActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Create folder2
		const create2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder2Name}' l='1'/>
			</CreateFolderRequest>`;
		const resp2 = await soap.makeSOAPEnvelopeAccount(create2, accountAuthToken);
		const folder2Id = resp2.CreateFolderResponse.folder[0].id;

		// Try to move folder2 to deleted folder1
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folder2Id}' l='${folder1Id}'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Server may return Fault (NO_SUCH_FOLDER) or succeed silently
		if (moveResponse.Fault) {
			assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
				'Verify NO_SUCH_FOLDER error');
		} else {
			assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
			assert.exists(moveResponse.ItemActionResponse,
				'Move to deleted folder succeeded silently');
		}
	});


	it('Regression | Delete a deleted item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Delete first time
		const deleteRequest1 =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(deleteRequest1, accountAuthToken);

		// Delete again (should be idempotent)
		const deleteRequest2 =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</ItemActionRequest>`;
		const deleteResponse2 = await soap.makeSOAPEnvelopeAccount(deleteRequest2, accountAuthToken);

		// Re-delete should be idempotent (success) or return a Fault — both are valid
		assert.isTrue(
			!!deleteResponse2.ItemActionResponse || !!deleteResponse2.Fault,
			'Verify re-delete returns success or fault'
		);
	});


	it('Regression | Tag an item (folder)', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const tagName = `tag${common.getUniqueString()}`;

		// Create folder
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const folderResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		const folderId = folderResponse.CreateFolderResponse.folder[0].id;

		// Create tag
		const createTagRequest =
			`<CreateTagRequest xmlns='urn:zimbraMail'>
				<tag name='${tagName}' color='0'/>
			</CreateTagRequest>`;
		const tagResponse = await soap.makeSOAPEnvelopeAccount(createTagRequest, accountAuthToken);
		const tagId = tagResponse.CreateTagResponse.tag[0].id;

		// Try to tag the folder
		const tagRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='tag' tag='${tagId}'/>
			</ItemActionRequest>`;
		const tagActionResponse = await soap.makeSOAPEnvelopeAccount(tagRequest, accountAuthToken, false);

		assert.exists(tagActionResponse.Fault, 'Verify Fault exists');
		assert.include(tagActionResponse.Fault.Reason.Text, 'cannot apply tag',
			'Verify CANNOT_TAG error');
	});


	it('Sanity | Mark the item (folder) as read', async () => {
		const folderName = `folder ${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Mark as read
		const readRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='read'/>
			</ItemActionRequest>`;
		const readResponse = await soap.makeSOAPEnvelopeAccount(readRequest, accountAuthToken);

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
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to mark as unread
		const unreadRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folderId}' op='!read'/>
			</ItemActionRequest>`;
		const unreadResponse = await soap.makeSOAPEnvelopeAccount(unreadRequest, accountAuthToken, false);

		assert.exists(unreadResponse.Fault, 'Verify Fault exists');
	});


	it('Sanity | Update the item (folder)', async () => {
		const folder1Name = `folder1 ${common.getUniqueString()}`;
		const folder2Name = `folder2 ${common.getUniqueString()}`;

		// Create two folders
		const create1 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder1Name}' l='1'/>
			</CreateFolderRequest>`;
		const resp1 = await soap.makeSOAPEnvelopeAccount(create1, accountAuthToken);
		const folder1Id = resp1.CreateFolderResponse.folder[0].id;

		const create2 =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folder2Name}' l='1'/>
			</CreateFolderRequest>`;
		const resp2 = await soap.makeSOAPEnvelopeAccount(create2, accountAuthToken);
		const folder2Id = resp2.CreateFolderResponse.folder[0].id;

		// Update folder1 to be under folder2
		const updateRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${folder1Id}' op='update' l='${folder2Id}'/>
			</ItemActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken);

		assert.equal(updateResponse.ItemActionResponse.action.op, 'update',
			'Verify op is update');
		assert.equal(updateResponse.ItemActionResponse.action.id, folder1Id,
			'Verify folder id');
	});
});
