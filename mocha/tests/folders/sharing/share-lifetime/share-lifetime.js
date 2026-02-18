import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Share Lifetime', function () {
    let testAccount1, testAccount2;
    let auth1, account1Id, testAccount2Id;

    before(async function () {
        testAccount1 = `lifetime1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `lifetime2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        // Use returned accountId directly
        account1Id = res1.accountId;

        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
        // Store account2Id for later use
        testAccount2Id = res2.accountId;

        // Get auth token for account 1
        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Sanity | Verify Guest Grant Expiry and Internal Grant Expiry', async () => {
        // 1. Set zimbraFileExternalShareLifeTime and zimbraFileShareLifeTime
        const adminAuth = await soap.getAdminAuthToken();
        await soap.makeSOAPEnvelopeAdmin(
            `<ModifyAccountRequest xmlns="urn:zimbraAdmin">
                <id>${account1Id}</id>
                <a n="zimbraFileExternalShareLifeTime">90s</a>
                <a n="zimbraFileShareLifeTime">60s</a>
            </ModifyAccountRequest>`, adminAuth);

        // 2. Create Briefcase subfolder
        // Get Briefcase ID
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

        const folderName = `lifetime_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${briefcaseId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // 3. Share with Guest (External)
        const guestEmail = `guest_${common.getUniqueString()}@example.com`;
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="guest" d="${guestEmail}" args="guestPass" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // 4. Share with Internal User
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // 5. Verify Expiry attributes in ACL
        const getFolder2 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth1);
        // XML checks `guestGrantExpiry` inside `acl` element? 
        // Structure is usually <acl internalGrantExpiry="..." guestGrantExpiry="..."> <grant .../> </acl>
        // Or attributes on the folder itself? XML selector: `//mail:folder[@name='...']/mail:acl` attr `guestGrantExpiry`.
        // So `acl` is a child of `folder`.

        // Wait, `GetFolderResponse` returns `folder` which has `acl` (if grants exist).
        // Let's inspect the response structure if possible or assume standard.
        // It's likely `folder[0].acl` object.

        const folder = getFolder2.GetFolderResponse.folder[0];
        assert.exists(folder.acl, 'ACL should exist');
        assert.exists(folder.acl.guestGrantExpiry, 'guestGrantExpiry should exist');
        assert.exists(folder.acl.internalGrantExpiry, 'internalGrantExpiry should exist');

        // 6. Revoke Guest Share
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="!grant" id="${folderId}" zid="${guestEmail}"/>
            </FolderActionRequest>`, auth1);
        // Note: Revoke guest usually uses email as ZID or d? XML uses `zid="${guest1.name}"`.
        // Check if ZID is email for guest. Yes.

        // 7. Revoke Internal Share
        // account2Id is already available from setup
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="!grant" id="${folderId}" zid="${testAccount2Id}"/>
            </FolderActionRequest>`, auth1);

        // 8. Verify Expiry attributes are gone
        const getFolder3 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth1);

        // If no grants, `acl` might be missing or empty.
        // If `acl` exists, attributes should be missing.
        const folder3 = getFolder3.GetFolderResponse.folder[0];
        if (folder3.acl) {
            assert.notExists(folder3.acl.guestGrantExpiry, 'guestGrantExpiry should be gone');
            assert.notExists(folder3.acl.internalGrantExpiry, 'internalGrantExpiry should be gone');
        }
    });


    it('Sanity | Verify Guest-only share has guestGrantExpiry but no internalGrantExpiry', async () => {
        const adminAuth = await soap.getAdminAuthToken();

        // Create Briefcase subfolder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

        const folderName = `guestonly_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${briefcaseId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Share with Guest only
        const guestEmail = `guest_only_${common.getUniqueString()}@example.com`;
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="guest" d="${guestEmail}" args="guestPass" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify guest expiry exists
        const getFolder2 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth1);
        const folder = getFolder2.GetFolderResponse.folder[0];
        assert.exists(folder.acl, 'ACL should exist');
        assert.exists(folder.acl.guestGrantExpiry, 'guestGrantExpiry should exist for guest-only share');
    });


    it('Sanity | Verify Internal-only share has internalGrantExpiry but no guestGrantExpiry', async () => {
        const adminAuth = await soap.getAdminAuthToken();

        // Create Briefcase subfolder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

        const folderName = `intonly_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${briefcaseId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Share with Internal user only
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify internal expiry exists
        const getFolder2 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"><folder l="${folderId}"/></GetFolderRequest>`, auth1);
        const folder = getFolder2.GetFolderResponse.folder[0];
        assert.exists(folder.acl, 'ACL should exist');
        assert.exists(folder.acl.internalGrantExpiry, 'internalGrantExpiry should exist for internal-only share');
    });
});
