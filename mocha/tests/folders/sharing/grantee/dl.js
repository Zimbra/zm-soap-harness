import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Grantee > DL', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id;
    let dlId;

    before(async function () {
        testAccount1 = `grant_dl1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `grant_dl2_${common.getUniqueString()}@${config.testDomain}`;

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
        if (dlId) await soap.makeSOAPEnvelopeAdmin(`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin"><id>${dlId}</id></DeleteDistributionListRequest>`, adminAuth);
    });


    it('Sanity | Grantee: Distribution List (grp)', async () => {
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `grant_dl_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Create DL and add testAccount2
        const dlName = `dl_${common.getUniqueString()}@${config.testDomain}`;
        const adminAuth = await soap.getAdminAuthToken();
        const createDl = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dlName}</name></CreateDistributionListRequest>`, adminAuth);
        dlId = createDl.CreateDistributionListResponse.dl[0].id;

        await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
                <id>${dlId}</id>
                <dlm>${testAccount2}</dlm>
            </AddDistributionListMemberRequest>`, adminAuth);

        // Share with DL
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="grp" d="${dlName}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify Account2 (member) can access
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_dl" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse.link, 'DL member should be able to mount folder');
    });


    it('Sanity | Unshare folder from DL, verify no access', async () => {
        // Create folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `revoke_dl_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        const addMsg = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Date: Mon, 1 Jan 2024 12:00:00 -0800
From: foo@example.com
To: bar@example.com
Subject: test_revoke_dl
MIME-Version: 1.0
Content-Type: text/plain

Test message for revoke dl test
</content></m></AddMsgRequest>`, auth1);
        const msgId = addMsg.AddMsgResponse.m[0].id;

        // Create another DL and add testAccount2
        const dlName2 = `dl_rev_${common.getUniqueString()}@${config.testDomain}`;
        const adminAuth = await soap.getAdminAuthToken();
        const createDl2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dlName2}</name></CreateDistributionListRequest>`, adminAuth);
        const dl2Id = createDl2.CreateDistributionListResponse.dl[0].id;

        await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
                <id>${dl2Id}</id>
                <dlm>${testAccount2}</dlm>
            </AddDistributionListMemberRequest>`, adminAuth);

        // Share with DL
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="grp" d="${dlName2}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify access works
        const accessCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.notExists(accessCheck.Fault, 'DL member should have access before revoke');

        // Revoke the grant
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${folderId}" op="!grant" zid="${dl2Id}"/>
            </FolderActionRequest>`, auth1);

        // Verify access denied
        const revokedCheck = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.exists(revokedCheck.Fault, 'DL member should be denied after revoke');

        // Cleanup DL
        await soap.makeSOAPEnvelopeAdmin(`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin"><id>${dl2Id}</id></DeleteDistributionListRequest>`, adminAuth);
    });


    it('Functional | Delegate folder to nested DL (DL within DL)', async () => {
        const adminAuth = await soap.getAdminAuthToken();

        // Create inner DL with testAccount2
        const innerDlName = `dl_inner_${common.getUniqueString()}@${config.testDomain}`;
        const innerDlResp = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${innerDlName}</name></CreateDistributionListRequest>`, adminAuth);
        const innerDlId = innerDlResp.CreateDistributionListResponse.dl[0].id;

        await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
                <id>${innerDlId}</id>
                <dlm>${testAccount2}</dlm>
            </AddDistributionListMemberRequest>`, adminAuth);

        // Create outer DL containing inner DL
        const outerDlName = `dl_outer_${common.getUniqueString()}@${config.testDomain}`;
        const outerDlResp = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${outerDlName}</name></CreateDistributionListRequest>`, adminAuth);
        const outerDlId = outerDlResp.CreateDistributionListResponse.dl[0].id;

        await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
                <id>${outerDlId}</id>
                <dlm>${innerDlName}</dlm>
            </AddDistributionListMemberRequest>`, adminAuth);

        // Create a folder and share with outer DL
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `nested_dl_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Date: Mon, 1 Jan 2024 12:00:00 -0800
From: foo@example.com
To: bar@example.com
Subject: test_nested_dl
MIME-Version: 1.0
Content-Type: text/plain

Test message for nested DL
</content></m></AddMsgRequest>`, auth1);

        // Share with outer DL
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="grp" d="${outerDlName}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify Account2 (inner DL member) can access via mountpoint
        const mountName = `mount_nested_dl_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Nested DL member should be able to mount folder');

        // Cleanup
        await soap.makeSOAPEnvelopeAdmin(`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin"><id>${innerDlId}</id></DeleteDistributionListRequest>`, adminAuth);
        await soap.makeSOAPEnvelopeAdmin(`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin"><id>${outerDlId}</id></DeleteDistributionListRequest>`, adminAuth);
    });
});
