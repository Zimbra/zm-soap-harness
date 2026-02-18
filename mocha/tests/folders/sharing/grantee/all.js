import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Grantee > All', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id;

    before(async function () {
        testAccount1 = `grant_all1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `grant_all2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

        account1Id = res1.accountId;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Sanity | Grantee: All (all)', async () => {
        // Setup Folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `grant_all_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Share with All (Authenticated Users)
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="all" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify authenticated user (Account2) can access
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_all" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse.link, 'All grant should allow authenticated user to mount');
    });


    it('Sanity | Unshare folder from all, verify no access', async () => {
        // Create folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `revoke_all_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        const addMsg = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Date: Mon, 1 Jan 2024 12:00:00 -0800
From: foo@example.com
To: bar@example.com
Subject: test_revoke_all
MIME-Version: 1.0
Content-Type: text/plain

Test message for revoke all test
</content></m></AddMsgRequest>`, auth1);
        const msgId = addMsg.AddMsgResponse.m[0].id;

        // Share with All
        const grantResp = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="all" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);
        const grantZid = grantResp.FolderActionResponse.action.zid;

        // Verify access works
        const accessCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.notExists(accessCheck.Fault, 'User should have access before revoke');

        // Revoke the grant using zid from grant response
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${folderId}" op="!grant" zid="${grantZid || '00000000-0000-0000-0000-000000000000'}"/>
            </FolderActionRequest>`, auth1);

        // Verify access denied
        const revokedCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.exists(revokedCheck.Fault, 'User should be denied after revoking all grant');
    });
});
