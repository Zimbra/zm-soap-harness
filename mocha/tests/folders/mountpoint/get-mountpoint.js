import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Mountpoint > Get', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id, account2Id;
    let folderId, mountId;

    before(async function () {
        testAccount1 = `mp_get1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `mp_get2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        account1Id = res1.accountId;
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
        account2Id = res2.accountId;

        // Setup shared folder and mountpoint
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `mp_get_folder_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        folderId = createResp.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        const mountName = `mount_get_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        mountId = mountResp.CreateMountpointResponse.link[0].id;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Functional | Get Folder Request (Mountpoint)', async () => {
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail">
                <folder l="${mountId}"/>
            </GetFolderRequest>`, auth2);

        // Should return the link details AND potentially the resolved folder content?
        // XML checks `//mail:GetFolderResponse/mail:link[@id='${account2.mount1.id}']`
        // And checks attributes like `zid`, `rid`, `owner`.

        const link = resp.GetFolderResponse.link[0];
        // Note: GetFolderRequest returning a mountpoint usually returns it as <link> or <folder> depending on structure?
        // Usually it's in the response body.

        assert.equal(link.id, mountId, 'Link ID match');
        assert.equal(link.zid, account1Id, 'Owner ZID match');
        assert.equal(link.rid, folderId, 'Remote ID match');
    });
});
