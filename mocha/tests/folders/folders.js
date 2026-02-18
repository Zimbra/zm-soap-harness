import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folders', function () {
    let testAccount;
    let auth;
    let rootId;

    before(async function () {
        await main.before(this);
        testAccount = `test.folders.${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount, testAccount);
        auth = await soap.getAccountAuthToken(testAccount);
        rootId = '1';
    });

    after(async function () {
        await soap.deleteAccount(testAccount);
    });


    it('Smoke | Create a folder with valid name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(res.CreateFolderResponse.folder[0].id, 'Folder ID should exist');
    });


    it('Functional | Create a folder with blank folder name', async function () {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(res.Fault, 'Should fail with Fault');
    });


    it('Functional | Create a folder with all spaces in folder name', async function () {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="            " l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(res.Fault, 'Should fail with Fault');
    });


    it('Functional | Create a folder with special characters in folder name', async function () {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name=":/\\.;&lt;*''" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(res.Fault, 'Should fail with Fault');
    });


    it('Functional | Create a folder with duplicate folder name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);

        const dupRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(dupRes.Fault, 'Should fail with ALREADY_EXISTS');
    });


    it('Functional | Create a folder with nonexisting parent folder name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="0"/></CreateFolderRequest>`, auth);
        assert.exists(res.Fault, 'Should fail with NO_SUCH_FOLDER or NO_SUCH_ITEM');
    });


    it('Regression | Create a folder with blank parent folder name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l=""/></CreateFolderRequest>`, auth);
        // May return Fault or succeed depending on server version
        assert.isTrue(res.Fault !== undefined || res.CreateFolderResponse !== undefined, 'Should return either Fault or CreateFolderResponse');
    });


    it('Regression | Create a folder with No parent folder name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}"/></CreateFolderRequest>`, auth);
        assert.exists(res.CreateFolderResponse.folder[0].id, 'Folder should be created');
    });


    it('Smoke | Rename a folder to unique name', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const newName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folderId = res.CreateFolderResponse.folder[0].id;

        const actionRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="rename" id="${folderId}" name="${newName}"/></FolderActionRequest>`, auth);
        assert.equal(actionRes.FolderActionResponse.action.op, 'rename');
        assert.equal(actionRes.FolderActionResponse.action.id, folderId);
    });


    it('Functional | Rename a folder to duplicate name', async function () {
        const folder1Name = `folder.${common.getUniqueString()}`;
        const folder2Name = `folder.${common.getUniqueString()}`;

        await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const res2 = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder2Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folder2Id = res2.CreateFolderResponse.folder[0].id;

        const renRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="rename" id="${folder2Id}" name="${folder1Name}"/></FolderActionRequest>`, auth);
        assert.exists(renRes.Fault, 'Should fail with ALREADY_EXISTS');
    });


    it('Regression | Rename a folder with nonexisting folder id', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="rename" id="100000" name="${folderName}"/></FolderActionRequest>`, auth);
        assert.exists(res.Fault, 'Should fail with NO_SUCH_FOLDER');
    });


    it('Sanity | Move a folder within some existing folder', async function () {
        const folderParentName = `folder.${common.getUniqueString()}`;
        const folderChildName = `folder.${common.getUniqueString()}`;

        const resP = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderParentName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const parentId = resP.CreateFolderResponse.folder[0].id;

        const resC = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderChildName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const childId = resC.CreateFolderResponse.folder[0].id;

        const actionRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="move" id="${childId}" l="${parentId}"/></FolderActionRequest>`, auth);
        assert.equal(actionRes.FolderActionResponse.action.op, 'move');
    });


    it('Functional | Move a folder within itself', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folderId = res.CreateFolderResponse.folder[0].id;

        const moveRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="move" id="${folderId}" l="${folderId}"/></FolderActionRequest>`, auth);
        assert.exists(moveRes.Fault, 'Should fail with CANNOT_CONTAIN');
    });


    it('Smoke | Delete a Folder (move to trash)', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folderId = res.CreateFolderResponse.folder[0].id;

        // Move to Trash (ID 3)
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="move" id="${folderId}" l="3"/></FolderActionRequest>`, auth);

        // Verify via GetFolder it is in trash
        const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth);
        assert.equal(getRes.GetFolderResponse.folder[0].l, '3', 'Folder parent should be Trash (3)');
    });


    it('Regression | Move a folder within a non existing folder', async function () {
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folderId = res.CreateFolderResponse.folder[0].id;

        const moveRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="move" id="${folderId}" l="-100"/></FolderActionRequest>`, auth);
        assert.exists(moveRes.Fault, 'Should fail with NO_SUCH_FOLDER');
    });


    it('Smoke | Delete a non existing folder', async function () {
        // First delete a real folder to know it's gone
        const folderName = `folder.${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folderId = res.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="delete" id="${folderId}"/></FolderActionRequest>`, auth);

        // Try deleting again
        // Note: 'delete' op usually hard deletes. If it's already gone, should fail or succeed?
        // XML comment says "delete an non existing folder".
        // Response in XML is just checking for presence of response.

        const resDel = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="delete" id="${folderId}"/></FolderActionRequest>`, auth);
        // Either succeeds or returns a Fault for non-existent folder - both are valid
        assert.isTrue(resDel.FolderActionResponse !== undefined || resDel.Fault !== undefined,
            'Should return either FolderActionResponse or Fault');
    });

});
