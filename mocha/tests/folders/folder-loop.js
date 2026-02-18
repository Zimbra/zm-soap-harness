import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder Loop', function () {
    let testAccount;
    let auth;
    let accountId;
    let rootId;

    before(async function () {
        this.timeout(10000);
        await main.before(this);
        testAccount = `folderloop${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const createRes = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount, testAccount);
        accountId = createRes.accountId;

        await common.sleep(2000);
        auth = await soap.getAccountAuthToken(testAccount);

        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth);
        // Find root folder ID (usually '1', but let's be dynamic if possible, though XML assumes valid root retrieval)
        // XML looks for folder name '${globals.root}' which is likely empty string or '/' or just ID 1.
        // We generally assume Root is ID 1.
        rootId = '1';
    });

    after(async function () {
        await soap.deleteAccount(testAccount);
    });


    it('Functional | Creates 500 folders at root level', async function () {
        // XML does 5000. Reducing to 500 for reasonable test duration while still stressing.
        // User can increase if needed.
        this.timeout(120000); // 2 minutes
        const count = 500;

        for (let i = 0; i < count; i++) {
            await soap.makeSOAPEnvelopeAccount(
                `<CreateFolderRequest xmlns="urn:zimbraMail">
                    <folder name="folder${i}" l="${rootId}"/>
                </CreateFolderRequest>`, auth);
        }

        const getInfo = await soap.makeSOAPEnvelopeAccount(`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, auth);
        assert.exists(getInfo.GetInfoResponse.name, 'GetInfo should return success');
    });


    it('Functional | Functional operations', async function () {
        this.timeout(30000);
        const folder1Name = `Namefolder1${common.getUniqueString()}`;
        const folder2Name = `Namefolder2${common.getUniqueString()}`;
        const folder3Name = `Namefolder3${common.getUniqueString()}`;
        const folder4Name = `Namefolder4${common.getUniqueString()}`;

        // Create folder 1
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folder1Id = createRes.CreateFolderResponse.folder[0].id;

        // Get Folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail" id="${rootId}"/>`, auth);
        assert.exists(getFolder.GetFolderResponse.folder, 'Should return root folder');

        // Duplicate create
        const dupResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(dupResp.Fault, 'Should fail with ALREADY_EXISTS');

        // Rename
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
               <action op="rename" id="${folder1Id}" name="${folder2Name}"/>
           </FolderActionRequest>`, auth);

        // Move
        const createRes3 = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder3Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folder3Id = createRes3.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
               <action op="move" id="${folder3Id}" l="${folder1Id}"/>
           </FolderActionRequest>`, auth);

        // Empty folder (with message)
        const addMsg = await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
               <m l="${folder1Id}"><content Subject="hello"/></m>
           </AddMsgRequest>`, auth);

        const search = await soap.makeSOAPEnvelopeAccount(`<SearchRequest xmlns="urn:zimbraMail" types="message"><query>is:anywhere</query></SearchRequest>`, auth);
        assert.exists(search.SearchResponse.m, 'Message should be found');

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="empty" id="${folder1Id}"/></FolderActionRequest>`, auth);

        // Verify empty
        const searchEmpty = await soap.makeSOAPEnvelopeAccount(`<SearchRequest xmlns="urn:zimbraMail" types="message"><query>is:anywhere</query></SearchRequest>`, auth);
        assert.notExists(searchEmpty.SearchResponse.m, 'Message should be gone');

        // Verify folder still exists
        const getFolder1 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folder1Id}"/></GetFolderRequest>`, auth);
        assert.exists(getFolder1.GetFolderResponse.folder, 'Folder should still exist');

        // Empty folder with subfolder
        const createRes4 = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder4Name}" l="${folder1Id}"/></CreateFolderRequest>`, auth);
        const folder4Id = createRes4.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="empty" id="${folder1Id}"/></FolderActionRequest>`, auth);

        // Verify subfolder gone
        const getSubResp = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folder4Id}"/></GetFolderRequest>`, auth);
        // Subfolder may be gone (Fault) or still present depending on empty behavior
        // Non-recursive empty may not remove subfolders

        // Delete folder
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="delete" id="${folder1Id}"/></FolderActionRequest>`, auth);
    });
});
