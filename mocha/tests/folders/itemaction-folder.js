import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Item Action on Folder', function () {
    this.timeout(30 * 1000);
    let accountAuthToken;

    before(async function () {
        await main.before(this.ctx);
        const accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });


    it('Smoke | Move a folder within existing folder using ItemActionRequest', async () => {
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

        assert.equal(moveResponse.ItemActionResponse.action.op, 'move', 'Verify op is move');
        assert.equal(moveResponse.ItemActionResponse.action.id, folderBId, 'Verify folder id');
    });


    it('Functional | Move a folder within itself using ItemActionRequest', async () => {
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
        const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

        assert.exists(moveResponse.Fault, 'Verify Fault exists');
        assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
            'Verify CANNOT_CONTAIN error');
    });


    it('Sanity | Move a folder to trash using ItemActionRequest', async () => {
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

        assert.equal(moveResponse.ItemActionResponse.action.op, 'move', 'Verify op is move');
        assert.equal(moveResponse.ItemActionResponse.action.id, folderId, 'Verify folder id');
    });


    it('Regression | Move a folder to non-existing folder using ItemActionRequest', async () => {
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
        const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

        assert.exists(moveResponse.Fault, 'Verify Fault exists');
        assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
            'Verify NO_SUCH_FOLDER error');
    });


    it('Sanity | Delete a folder using ItemActionRequest', async () => {
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
        const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

        assert.equal(deleteResponse.ItemActionResponse.action.op, 'delete', 'Verify op is delete');
        assert.equal(deleteResponse.ItemActionResponse.action.id, folderId, 'Verify folder id');
    });


    it('Regression | Move a folder to a deleted folder using ItemActionRequest', async () => {
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
        const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

        assert.exists(moveResponse.Fault, 'Verify Fault exists');
        assert.include(moveResponse.Fault.Reason.Text, 'no such folder',
            'Verify NO_SUCH_FOLDER error');
    });


    it('Regression | Delete already deleted folder using ItemActionRequest | BUG-11018', async () => {
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

        assert.exists(deleteResponse2.ItemActionResponse, 'Verify re-delete does not fail');
    });


    it('Regression | Tag a folder using ItemActionRequest | BUG-3764', async () => {
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
        const tagActionResponse = await soap.makeSOAPEnvelopeAccount(tagRequest, accountAuthToken);

        assert.exists(tagActionResponse.Fault, 'Verify Fault exists');
        assert.include(tagActionResponse.Fault.Reason.Text, 'cannot apply tag',
            'Verify CANNOT_TAG error');
    });


    it('Sanity | Mark a folder as read using ItemActionRequest', async () => {
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

        assert.equal(readResponse.ItemActionResponse.action.op, 'read', 'Verify op is read');
        assert.equal(readResponse.ItemActionResponse.action.id, folderId, 'Verify folder id');
    });


    it('Sanity | Try to mark a folder as unread using ItemActionRequest', async () => {
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
        const unreadResponse = await soap.makeSOAPEnvelopeAccount(unreadRequest, accountAuthToken);

        assert.exists(unreadResponse.Fault, 'Verify Fault exists');
    });


    it('Sanity | Update a folder location using ItemActionRequest', async () => {
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

        assert.equal(updateResponse.ItemActionResponse.action.op, 'update', 'Verify op is update');
        assert.equal(updateResponse.ItemActionResponse.action.id, folder1Id, 'Verify folder id');
    });
});
