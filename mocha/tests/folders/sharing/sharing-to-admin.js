import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Share to Admin', function () {
    let testAccount1, adminAccount1;
    let auth1, adminAuthUser, adminAuthAdmin;
    let account1Id;

    before(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        testAccount1 = `share_user_${common.getUniqueString()}@${config.testDomain}`;
        adminAccount1 = `share_admin_${common.getUniqueString()}@${config.testDomain}`; // This will be an Admin account

        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);

        // Create Admin Account
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${adminAccount1}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraIsAdminAccount">TRUE</a>
            </CreateAccountRequest>`, adminAuth);

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

        // Admin logs in as User (zimbraAccount)
        adminAuthUser = await soap.getAccountAuthToken(adminAccount1, config.accountPassword);

        // Admin logs in as Admin (zimbraAdmin)
        const authResp = await soap.makeSOAPEnvelopeAdmin(
            `<AuthRequest xmlns="urn:zimbraAdmin">
                <name>${adminAccount1}</name>
                <password>${config.accountPassword}</password>
            </AuthRequest>`, null); // No token needed for initial auth, but we don't have one? 
        // Wait, usually we use admin/admin credentials. Here we are authenticating AS the new admin.
        adminAuthAdmin = authResp.AuthResponse.authToken[0]._content;

        // Get account1Id via GetAccountRequest instead of getAccountId
        const getAccResp = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
                <account by="name">${testAccount1}</account>
            </GetAccountRequest>`, adminAuth);
        account1Id = getAccResp.GetAccountResponse.account[0].id;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (adminAccount1) await soap.deleteAccount(adminAccount1, adminAuth);
    });


    it('Sanity | Admin as User: Respects Read-Only share', async () => {
        // User shares folder with Admin (Read Only)
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `admin_share_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${adminAccount1}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Admin (User Auth) mounts
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_admin_user" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, adminAuthUser);
        const mountId = mountResp.CreateMountpointResponse.link[0].id;

        // Try AddMsg (Should Fail)
        const addRes = await soap.makeSOAPEnvelopeAccount(`<AddMsgRequest xmlns="urn:zimbraMail"><m l="${mountId}"><content>Fail</content></m></AddMsgRequest>`, adminAuthUser);
        assert.exists(addRes.Fault, 'Admin using User Auth should be denied write access on Read-Only share');
    });


    it('Sanity | Admin as Admin: Overrides permissions (Superuser)', async () => {
        // User shares folder with Admin (Read Only) 
        // Admin uses Admin Auth to access mail?
        // Note: makeSOAPEnvelopeAdmin normally sends to /service/admin/soap.
        // But here we want to send Mail requests using Admin Token.
        // We need to target the user's mailbox (account1) acting as Admin?
        // Or target Admin's mailbox acting as Admin?
        // XML test `SharingFoldersToAdmin_02` uses `AuthRequest xmlns="urn:zimbraAdmin"` then `CreateMountpointRequest`.
        // `CreateMountpointRequest` is sent to the Admin's mailbox (implied by context or target account?).
        // In the XML, the Admin account is `admin1`.
        // The `CreateMountpointRequest` creates a link in `admin1`'s mailbox.
        // Does sending Mail requests with an Admin Token work against the Admin's own mailbox? Yes.

        // We need to use `soap.makeSOAPEnvelope(request, token, userAgent, session, namespace, endpoint)` ? 
        // Or just use `makeSOAPEnvelopeAccount` but pass the Admin Token?
        // `makeSOAPEnvelopeAccount` targets `/service/soap` (user endpoint). 
        // Admin tokens are valid at `/service/soap`.

        // Use the same folder and share as above.
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
        const folderName = `admin_superuser_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="${inboxId}"/></CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="usr" d="${adminAccount1}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Admin (Admin Auth) Creates Mountpoint
        // Use `makeSOAPEnvelopeAccount` with `adminAuthAdmin` token.
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="mount_admin_super" zid="${account1Id}" rid="${folderId}" view="message"/>
            </CreateMountpointRequest>`, adminAuthAdmin);
        const mountId = mountResp.CreateMountpointResponse.link[0].id;

        // Try AddMsg (Should Succeed because Admin is Superuser)
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${mountId}">
                    <content>Success</content>
                </m>
            </AddMsgRequest>`, adminAuthAdmin);
    });
});
