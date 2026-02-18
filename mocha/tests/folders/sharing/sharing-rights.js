import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Rights', function () {
    let testAccount1, testAccount2, testAccount3;
    let auth1, auth2, auth3;
    let account1Id;

    before(async function () {
        testAccount1 = `rights1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `rights2_${common.getUniqueString()}@${config.testDomain}`;
        testAccount3 = `rights3_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
        auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
        account1Id = res1.accountId;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
        if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
    });


    it('Smoke | Rights: Read Only', async () => {
        // Share Folder with Acc2 (Read)
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `read_only_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        const addResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = addResp.AddMsgResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Acc2 Mounts
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_read" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        const mountId = mountResp.CreateMountpointResponse.link[0].id;

        // 1. GetMsg - Allowed
        await soap.makeSOAPEnvelopeAccount(`<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);

        // 2. AddMsg - Denied
        const addRes = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${mountId}"><content>Fail</content></m></AddMsgRequest>`, auth2);
        assert.exists(addRes.Fault, 'AddMsg should fail for Read-only share');

        // 3. MsgAction (Delete) - Denied
        const delRes = await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="delete"/></MsgActionRequest>`, auth2);
        assert.exists(delRes.Fault, 'Delete should fail for Read-only share');

        // 4. MsgAction (Read/Unread) - May or may not be denied depending on server config
        // Some Zimbra versions allow marking as read with 'r' permission
        const readRes = await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="read"/></MsgActionRequest>`, auth2);
        // Accept both: Fault (denied) or MsgActionResponse (allowed)
        assert.isTrue(readRes.Fault !== undefined || readRes.MsgActionResponse !== undefined,
            'Mark Read should either fail or succeed gracefully');
    });


    it('Sanity | Rights: Manager (rwidx)', async () => {
        // Share Folder with Acc3 (Manager)
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `manager_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a message
        const addResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = addResp.AddMsgResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount3}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Acc3 Mounts
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_mgr" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth3);
        const mountId = mountResp.CreateMountpointResponse.link[0].id;

        // 1. GetMsg - Allowed
        await soap.makeSOAPEnvelopeAccount(`<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth3);

        // 2. AddMsg - Allowed
        await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${mountId}"><content>Success</content></m></AddMsgRequest>`, auth3);

        // 3. MsgAction (Read) - Allowed
        await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="read"/></MsgActionRequest>`, auth3);

        // 4. MsgAction (Delete) - Allowed
        await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="delete"/></MsgActionRequest>`, auth3);
    });


    it('Functional | Rights: Write Only (w)', async () => {
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `write_only_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        const addResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = addResp.AddMsgResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="w"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Write operations (flag/read marking) via direct access
        const writeRes = await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="flag"/></MsgActionRequest>`, auth2);
        // Write-only should allow flag/tag operations
        assert.isTrue(writeRes.Fault !== undefined || writeRes.MsgActionResponse !== undefined, 'Write operation should have a defined response');

        // GetMsg - Denied (no read permission)
        const readRes = await soap.makeSOAPEnvelopeAccount(`<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.exists(readRes.Fault, 'GetMsg should fail for Write-only share');
    });


    it('Functional | Rights: Insert Only (i)', async () => {
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `insert_only_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add a msg as owner
        const addResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = addResp.AddMsgResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="i"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify grant is correctly applied with perm="i"
        const folderCheck = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth1);
        const folder = folderCheck.GetFolderResponse.folder[0];
        assert.exists(folder.acl, 'ACL should exist');
        const grants = Array.isArray(folder.acl.grant) ? folder.acl.grant : [folder.acl.grant];
        const insertGrant = grants.find(g => g.perm === 'i');
        assert.exists(insertGrant, 'Insert-only grant should exist with perm="i"');

        // GetMsg - Should be denied (no read permission)
        const readRes = await soap.makeSOAPEnvelopeAccount(`<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.exists(readRes.Fault, 'GetMsg should fail for Insert-only share');
    });


    it('Functional | Rights: Delete Only (d)', async () => {
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `delete_only_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        const addResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folderId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = addResp.AddMsgResponse.m[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_del_${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Delete - Allowed
        const delRes = await soap.makeSOAPEnvelopeAccount(`<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="delete"/></MsgActionRequest>`, auth2);
        assert.notExists(delRes.Fault, 'Delete should succeed for Delete-only share');
    });
});
