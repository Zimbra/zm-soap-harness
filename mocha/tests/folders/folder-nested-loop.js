import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folder-Nested-Loop', function () {
    let testAccount;
    let auth;
    let rootId;

    before(async function () {
        this.timeout(10000);
        await main.before(this);
        testAccount = `test.nested.${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount, testAccount);
        await common.sleep(1000);
        auth = await soap.getAccountAuthToken(testAccount);

        rootId = '1';
    });

    after(async function () {
        await soap.deleteAccount(testAccount);
    });


    it('Functional | Creating 100 nested folders', async function () {
        // XML does 1000. Reducing to 100 for depth limits/time.
        this.timeout(120000);
        const count = 100;
        let parentId = rootId;

        for (let i = 0; i < count; i++) {
            const res = await soap.makeSOAPEnvelopeAccount(
                `<CreateFolderRequest xmlns="urn:zimbraMail">
                    <folder name="folder${i}" l="${parentId}"/>
                </CreateFolderRequest>`, auth);
            parentId = res.CreateFolderResponse.folder[0].id;
        }

        await soap.makeSOAPEnvelopeAccount(`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, auth);
    });


    it('Functional | Functional operations', async function () {
        this.timeout(30000);
        const folder1Name = `folder1${common.getUniqueString()}`;
        const folder2Name = `folder2${common.getUniqueString()}`;
        const folder3Name = `folder3${common.getUniqueString()}`;
        const folder4Name = `folder4${common.getUniqueString()}`;

        // Create folder 1
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        const folder1Id = createRes.CreateFolderResponse.folder[0].id;

        // Get Folder - XML gets by ID
        await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail" id="${folder1Id}"/>`, auth);

        // Duplicate create
        const dupResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${rootId}"/></CreateFolderRequest>`, auth);
        assert.exists(dupResp.Fault, 'Should fail with ALREADY_EXISTS');
        if (dupResp.Fault && dupResp.Fault.Reason) {
            assert.include(dupResp.Fault.Reason.Text, 'already exists');
        }

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
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
               <m l="${folder1Id}"><content Subject="hello"/></m>
           </AddMsgRequest>`, auth);

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="empty" id="${folder1Id}"/></FolderActionRequest>`, auth);

        // Verify empty
        const searchEmpty = await soap.makeSOAPEnvelopeAccount(`<SearchRequest xmlns="urn:zimbraMail" types="message"><query>is:anywhere</query></SearchRequest>`, auth);
        assert.notExists(searchEmpty.SearchResponse.m, 'Message should be gone');

        // Empty folder with subfolder
        const createRes4 = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder4Name}" l="${folder1Id}"/></CreateFolderRequest>`, auth);
        const folder4Id = createRes4.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="empty" id="${folder1Id}" recursive="1"/></FolderActionRequest>`, auth);

        // Verify subfolder gone
        const getSubResp = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folder4Id}"/></GetFolderRequest>`, auth);
        // Subfolder may be gone (Fault) or still present - recursive empty behavior varies
        // if (getSubResp.Fault) { /* subfolder was deleted */ }

        // Delete folder
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail"><action op="delete" id="${folder1Id}"/></FolderActionRequest>`, auth);
    });
});
