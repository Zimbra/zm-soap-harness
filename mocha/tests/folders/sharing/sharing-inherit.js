import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Inheritance', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id;

    before(async function () {
        testAccount1 = `inherit1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `inherit2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.defaultPassword);
        auth2 = await soap.getAccountAuthToken(testAccount2, config.defaultPassword);
        account1Id = res1.accountId;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Sanity | Verify flags="i" (inherit disabled?) does not allow subfolders to be read', async () => {
        // XML: Create folder1, Create folder2 inside with f="i". Share folder1. Folder2 should NOT be accessible?
        // Wait, f="i" usually means "Checked" in UI (IMAP subscribed?).
        // If XML says PERM_DENIED, then "i" might mean something else in local context or default is inherit and "i" blocks it?
        // Zimbra docs: f (flags):
        // u=unread, f=flagged, a=attachment, r=replied, s=sent, w=forwarded, d=draft, x=deleted, n=notification, i=indexed? 
        // Or maybe 'i' stands for 'exclude from free/busy'?
        // Actually, let's look at the XML behavior.
        // Grant is on folder1.
        // Subfolder2 is created with f="i".
        // Access to message in Subfolder2 is DENIED.
        // This implies inheritance blocked.

        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folder1Name = `folder1_${common.getUniqueString()}`;
        const create1 = `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder1Name}" l="${inboxId}"/></CreateFolderRequest>`;
        const resp1 = await soap.makeSOAPEnvelopeAccount(create1, auth1);
        const folder1Id = resp1.CreateFolderResponse.folder[0].id;

        const folder2Name = `folder2_${common.getUniqueString()}`;
        // pass f="i" 
        const create2 = `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder2Name}" l="${folder1Id}" f="i"/></CreateFolderRequest>`;
        const resp2 = await soap.makeSOAPEnvelopeAccount(create2, auth1);
        const folder2Id = resp2.CreateFolderResponse.folder[0].id;

        // Add messages
        await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folder1Id}"><content>Content1</content></m></AddMsgRequest>`, auth1);
        const ref2 = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folder2Id}"><content>Content2</content></m></AddMsgRequest>`, auth1);
        const msg2Id = ref2.AddMsgResponse.m[0].id;

        // Share folder1
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folder1Id}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount
        const mountName = `mount_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${folder1Id}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Try to get message in folder2 (which is subfolder of mountpoint)
        // Access via mountpoint: mountName/folder2Name ?
        // Or via Direct ID access? XML uses `GetMsgRequest` with `m id="account1Id:msg2Id"`.
        // This is Direct access checking permission.

        const getMsgResp = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
                    <m id="${account1Id}:${msg2Id}"/>
                </GetMsgRequest>`, auth2);
        assert.exists(getMsgResp.Fault, 'Access to subfolder should be denied with f="i"');
    });


    it('Sanity | Verify by default subfolders accept inherited rights', async () => {
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folder3Name = `folder3_${common.getUniqueString()}`;
        const create3 = `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder3Name}" l="${inboxId}"/></CreateFolderRequest>`;
        const resp3 = await soap.makeSOAPEnvelopeAccount(create3, auth1);
        const folder3Id = resp3.CreateFolderResponse.folder[0].id;

        const folder4Name = `folder4_${common.getUniqueString()}`;
        const create4 = `<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder4Name}" l="${folder3Id}"/></CreateFolderRequest>`;
        const resp4 = await soap.makeSOAPEnvelopeAccount(create4, auth1);
        const folder4Id = resp4.CreateFolderResponse.folder[0].id;

        // Add msg to subfolder
        const ref4 = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${folder4Id}"><content>Content4</content></m></AddMsgRequest>`, auth1);
        const msg4Id = ref4.AddMsgResponse.m[0].id;

        // Share parent folder3
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folder3Id}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_${folder3Name}" zid="${account1Id}" rid="${folder3Id}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Verify Access to subfolder message
        const getMsg = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
                    <m id="${account1Id}:${msg4Id}"/>
                </GetMsgRequest>`, auth2);
        assert.exists(getMsg.GetMsgResponse.m, 'Should be able to get message in inherited subfolder');
    });


    it('Functional | Multi-level nesting inherits rights through 3 levels', async () => {
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        // Create 3-level folder structure: parent > child > grandchild
        const parentName = `parent_${common.getUniqueString()}`;
        const parentResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${parentName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const parentId = parentResp.CreateFolderResponse.folder[0].id;

        const childName = `child_${common.getUniqueString()}`;
        const childResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${childName}" l="${parentId}"/></CreateFolderRequest>`, auth1);
        const childId = childResp.CreateFolderResponse.folder[0].id;

        const grandchildName = `grandchild_${common.getUniqueString()}`;
        const grandchildResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${grandchildName}" l="${childId}"/></CreateFolderRequest>`, auth1);
        const grandchildId = grandchildResp.CreateFolderResponse.folder[0].id;

        // Add message to grandchild
        const msgResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${grandchildId}"><content>Grandchild content</content></m></AddMsgRequest>`, auth1);
        const msgId = msgResp.AddMsgResponse.m[0].id;

        // Share parent folder only
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${parentId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount parent
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Verify access to grandchild message (inherited through 2 levels)
        const getMsg = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail"><m id="${account1Id}:${msgId}"/></GetMsgRequest>`, auth2);
        assert.exists(getMsg.GetMsgResponse.m, 'Should access grandchild message via multi-level inheritance');
    });


    it('Functional | Subfolder with separate grant overrides parent rights', async () => {
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const parentName = `parent_override_${common.getUniqueString()}`;
        const parentResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${parentName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const parentId = parentResp.CreateFolderResponse.folder[0].id;

        const childName = `child_override_${common.getUniqueString()}`;
        const childResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${childName}" l="${parentId}"/></CreateFolderRequest>`, auth1);
        const childId = childResp.CreateFolderResponse.folder[0].id;

        // Add msg to child
        const msgResp = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${childId}"><content>Content</content></m></AddMsgRequest>`, auth1);
        const msgId = msgResp.AddMsgResponse.m[0].id;

        // Share parent with read-only
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${parentId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Share child with manager rights (override)
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${childId}">
                    <grant gt="usr" d="${testAccount2}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount parent
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Verify acc2 can delete msg in child (manager rights override read-only)
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<MsgActionRequest xmlns="urn:zimbraMail"><action id="${account1Id}:${msgId}" op="delete"/></MsgActionRequest>`, auth2);
        assert.notExists(delRes.Fault, 'Child folder override should allow delete even though parent is read-only');
    });
});
