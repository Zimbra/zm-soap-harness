import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > GetEffectiveFolderPermsRequest-Basic', function () {
    let testAccount1, testAccount2;
    let auth1, auth2;
    let account1Id;
    let adminAuth;
    let folderId;

    before(async function () {
        adminAuth = await soap.getAdminAuthToken();
        testAccount1 = `perms_owner_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `perms_sharee_${common.getUniqueString()}@${config.testDomain}`;

        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
        account1Id = res1.accountId;

        // Create a folder for sharing
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `perms_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        folderId = createResp.CreateFolderResponse.folder[0].id;
    });

    after(async function () {
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });

    async function shareWithPerm(perm) {
        // Grant permission to testAccount2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="${perm}"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount the folder for Account2
        const mountName = `mount_${perm}_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        return mountResp.CreateMountpointResponse.link[0].id;
    }

    async function getEffectivePerms(mountId) {
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<GetEffectiveFolderPermsRequest xmlns="urn:zimbraMail">
                <folder l="${mountId}"/>
            </GetEffectiveFolderPermsRequest>`, auth2);
        return resp;
    }


    it('Smoke | GetEffectiveFolderPermsRequest for read access', async () => {
        // Revoke existing grants first
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('r');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'r', 'Effective perms should include read');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for write access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('rw');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'w', 'Effective perms should include write');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for delete access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('rd');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'd', 'Effective perms should include delete');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for insert access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('ri');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'i', 'Effective perms should include insert');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for freebusy access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('rf');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'f', 'Effective perms should include freebusy');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for workflow access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('rwidx');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'w', 'Effective perms should include workflow rights');
        assert.include(perms, 'i', 'Effective perms should include insert');
    });


    it('Sanity | GetEffectiveFolderPermsRequest for admin access', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        const mountId = await shareWithPerm('rwidxa');
        const resp = await getEffectivePerms(mountId);

        assert.exists(resp.GetEffectiveFolderPermsResponse, 'Response should exist');
        const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;
        assert.include(perms, 'a', 'Effective perms should include admin');
    });


    it('Sanity | GetEffectiveFolderPermsRequest after revoking permission', async () => {
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="revokeorphangrants" id="${folderId}"/>
            </FolderActionRequest>`, auth1);

        // Grant first
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Revoke
        const account2Id = (await soap.getAccount(adminAuth, testAccount2));
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${folderId}" op="!grant" zid="${account2Id}"/>
            </FolderActionRequest>`, auth1);

        // Try to mount after revoke - should fail or show no perms
        const mountName = `mount_revoked_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        if (mountResp.CreateMountpointResponse) {
            const mountId = mountResp.CreateMountpointResponse.link[0].id;
            const resp = await getEffectivePerms(mountId);
            // After revoke, perms should be empty or mount should show broken
            if (resp.GetEffectiveFolderPermsResponse) {
                const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm || '';
                assert.equal(perms, '', 'Effective perms should be empty after revoke');
            }
        }
        // If mount itself fails, that's also acceptable — no access
    });
});
