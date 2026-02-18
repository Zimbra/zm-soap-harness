import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Grantee > COS', function () {
    let testAccount1, cosAccount;
    let auth1, cosAuth;
    let account1Id;
    let cosId;

    before(async function () {
        testAccount1 = `grant_cos1_${common.getUniqueString()}@${config.testDomain}`;
        cosAccount = `cos_user_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        account1Id = res1.accountId;

        // Create COS
        const cosName = `cos_${common.getUniqueString()}`;
        const createCos = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCosRequest xmlns="urn:zimbraAdmin"><name>${cosName}</name></CreateCosRequest>`, adminAuth);
        cosId = createCos.CreateCosResponse.cos[0].id;

        // Create Account in COS
        // We create it first then modify COS because `createAccountByNameAndEmailAddress` helper might limit options.
        // Or we use createAccount directly. Let's use helper then modify.
        const cosAccRes = await soap.createAccountByNameAndEmailAddress(adminAuth, cosAccount, cosAccount);
        const accId = cosAccRes.accountId;
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
                <id>${accId}</id>
                <a n="zimbraCOSId">${cosId}</a>
            </ModifyAccountRequest>`, adminAuth);

        cosAuth = await soap.getAccountAuthToken(cosAccount, config.accountPassword);

        // Store COS name for test
        this.cosName = cosName;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (cosAccount) await soap.deleteAccount(cosAccount, adminAuth);
        if (cosId) await soap.makeSOAPEnvelopeAdmin(`<DeleteCosRequest xmlns="urn:zimbraAdmin"><id>${cosId}</id></DeleteCosRequest>`, adminAuth);
    });


    it('Sanity | Grantee: COS (cos)', async function () {
        // Setup Folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `grant_cos_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Share with COS
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="cos" d="${this.cosName}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify COS user can access
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_cos" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, cosAuth);
        assert.exists(mountResp.CreateMountpointResponse.link, 'COS member should be able to mount folder');
    });


    it('Sanity | Unshare folder from COS, verify no access', async function () {
        // Create folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `revoke_cos_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        const addMsg = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Date: Mon, 1 Jan 2024 12:00:00 -0800
From: foo@example.com
To: bar@example.com
Subject: test_revoke_cos
MIME-Version: 1.0
Content-Type: text/plain

Test message for revoke cos test
</content></m></AddMsgRequest>`, auth1);
        const msgId = addMsg.AddMsgResponse.m[0].id;

        // Share with COS
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="cos" d="${this.cosName}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify COS user has access
        const accessCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, cosAuth);
        assert.notExists(accessCheck.Fault, 'COS member should have access before revoke');

        // Revoke the grant
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${folderId}" op="!grant" zid="${cosId}"/>
            </FolderActionRequest>`, auth1);

        // Verify access denied
        const revokedCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, cosAuth);
        assert.exists(revokedCheck.Fault, 'COS member should be denied after revoke');
    });
});
