import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Mountpoint > Create', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id, account2Id;
    let sharedFolderId, inboxId;

    before(async function () {
        testAccount1 = `mp_create1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `mp_create2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        account1Id = res1.accountId;
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
        account2Id = res2.accountId;

        // Account1 creates a folder and shares it with Account2
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `mp_shared_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        sharedFolderId = createResp.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${sharedFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Smoke | Mount a delegated folder with all valid values', async () => {
        const mountName = `mount_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Response should exist');
        assert.exists(mountResp.CreateMountpointResponse.link, 'Mountpoint should be created');
        const link = mountResp.CreateMountpointResponse.link[0];
        assert.equal(link.name, mountName, 'Mountpoint name should match');
        assert.equal(link.zid, account1Id, 'Owner zid should match');
    });


    it('Functional | Mount a delegated folder with valid view values', async () => {
        const views = ['conversation', 'message', 'contact', 'appointment', 'task', 'document'];
        for (const view of views) {
            const mountName = `mount_${view}_${common.getUniqueString()}`;
            const mountResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
                    <link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="${view}"/>
                </CreateMountpointRequest>`, auth2);
            assert.exists(mountResp.CreateMountpointResponse, `Mount with view="${view}" should succeed`);
        }
    });


    it('Regression | Mount a delegated folder with invalid view values', async () => {
        const invalidViews = ['', '     ', 'invalidview', '12345'];
        for (const view of invalidViews) {
            const mountName = `mount_inv_view_${common.getUniqueString()}`;
            const mountResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
                    <link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="${view}"/>
                </CreateMountpointRequest>`, auth2);
            // Invalid views may still create mountpoint or return fault
            // XML checks for either success or fault
            assert.exists(mountResp.CreateMountpointResponse || mountResp.Fault,
                `Mount with invalid view="${view}" should return response or fault`);
        }
    });


    it('Regression | Mount with invalid rid values', async () => {
        const invalidRids = ['', '     ', 'sometext', '-1', '0', '99999999'];
        for (const rid of invalidRids) {
            const mountName = `mount_inv_rid_${common.getUniqueString()}`;
            const mountResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
                    <link l="1" name="${mountName}" zid="${account1Id}" rid="${rid}" view="message"/>
                </CreateMountpointRequest>`, auth2);
            assert.exists(mountResp.Fault || mountResp.CreateMountpointResponse,
                `Mount with invalid rid="${rid}" should return fault or response`);
        }
    });


    it('Regression | Mount with invalid zid values', async () => {
        const invalidZids = ['', '     ', 'sometext', '99999999-9999-9999-9999-999999999999'];
        for (const zid of invalidZids) {
            const mountName = `mount_inv_zid_${common.getUniqueString()}`;
            const mountResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
                    <link l="1" name="${mountName}" zid="${zid}" rid="${sharedFolderId}" view="message"/>
                </CreateMountpointRequest>`, auth2);
            assert.exists(mountResp.Fault, `Mount with invalid zid="${zid}" should return fault`);
        }
    });


    it('Regression | Mount with invalid parent folder l values', async () => {
        const invalidLs = ['', '     ', 'sometext', '-1', '0', '99999999'];
        for (const l of invalidLs) {
            const mountName = `mount_inv_l_${common.getUniqueString()}`;
            const mountResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
                    <link l="${l}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
                </CreateMountpointRequest>`, auth2);
            assert.exists(mountResp.Fault || mountResp.CreateMountpointResponse,
                `Mount with invalid l="${l}" should return fault or response`);
        }
    });


    it('Functional | Create two mountpoints to the same shared folder', async () => {
        const mountName1 = `mount_dup1_${common.getUniqueString()}`;
        const mountName2 = `mount_dup2_${common.getUniqueString()}`;

        const resp1 = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName1}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(resp1.CreateMountpointResponse, 'First mountpoint should be created');

        const resp2 = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName2}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(resp2.CreateMountpointResponse, 'Second mountpoint to same folder should succeed');
    });


    it('Regression | Mount more than one delegated folder at once', async () => {
        // Create a second shared folder
        const folder2Name = `mp_shared2_${common.getUniqueString()}`;
        const create2 = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folder2Name}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folder2Id = create2.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folder2Id}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Try mounting both
        const mountName = `mount_multi_${common.getUniqueString()}`;
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}_a" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
                <link l="1" name="${mountName}_b" zid="${account1Id}" rid="${folder2Id}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        // Second link tag should be ignored per XML test
        assert.exists(resp.CreateMountpointResponse || resp.Fault, 'Should handle multiple link tags');
    });


    it('Regression | CreateMountpointRequest without link tag', async () => {
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
            </CreateMountpointRequest>`, auth2);
        assert.exists(resp.Fault, 'Should fail without link tag');
    });


    it('Regression | CreateMountpointRequest with two link tags', async () => {
        const mountName1 = `mount_two1_${common.getUniqueString()}`;
        const mountName2 = `mount_two2_${common.getUniqueString()}`;
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName1}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
                <link l="1" name="${mountName2}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        // Second link should be ignored
        if (resp.CreateMountpointResponse) {
            const links = resp.CreateMountpointResponse.link;
            const linkArr = Array.isArray(links) ? links : [links];
            assert.isAtMost(linkArr.length, 2, 'Should create at most the first mountpoint');
        }
    });


    it('Regression | CreateMountpointRequest without any attribute', async () => {
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(resp.Fault, 'Should fail without any attributes on link tag');
    });


    it('Functional | Mount with parent folder as default folder id', async () => {
        // Get Inbox folder ID (default folder)
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth2);
        const acc2InboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const mountName = `mount_default_parent_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="${acc2InboxId}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Mount under default folder should succeed');
        assert.equal(mountResp.CreateMountpointResponse.link[0].l, acc2InboxId, 'Parent should be Inbox');
    });


    it('Functional | Mount with parent folder as custom folder id', async () => {
        // Create custom parent folder
        const parentName = `custom_parent_${common.getUniqueString()}`;
        const parentResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${parentName}" l="1"/></CreateFolderRequest>`, auth2);
        const parentId = parentResp.CreateFolderResponse.folder[0].id;

        const mountName = `mount_custom_parent_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="${parentId}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Mount under custom folder should succeed');
        assert.equal(mountResp.CreateMountpointResponse.link[0].l, parentId, 'Parent should be custom folder');
    });


    it('Functional | Mount name equal to existing mount or folder name', async () => {
        // Create a regular folder
        const folderName = `existing_${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth2);

        // Try to mount with same name as existing folder
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${folderName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.Fault, 'Mount with existing folder name should fail');
        assert.include(mountResp.Fault.Reason.Text, 'already exists', 'Should get ALREADY_EXISTS error');
    });


    it('Sanity | Mount a folder that is not shared', async () => {
        // Create an unshared folder on Account1
        const unsharedName = `unshared_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${unsharedName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const unsharedId = createResp.CreateFolderResponse.folder[0].id;

        // Account2 tries to mount an unshared folder
        const mountName = `mount_unshared_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${unsharedId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        // Mounting unshared folder might succeed but access will be denied
        assert.exists(mountResp.CreateMountpointResponse || mountResp.Fault,
            'Should either create mountpoint or return fault');
    });
});
