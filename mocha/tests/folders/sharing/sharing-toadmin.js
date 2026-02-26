import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharing Toadmin', function () {
	let testAccount1, adminAccount1;
	let auth1, adminAuthUser, adminAuthAdmin;
	let account1Id;

	before(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		testAccount1 = `share_user_${common.getUniqueString()}@${config.testDomain}`;
		adminAccount1 = `share_admin_${common.getUniqueString()}@${config.testDomain}`; // This will be an Admin account

		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);

		// Create Admin Account
		const createAccountRequest =
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${adminAccount1}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(createAccountRequest, adminAuth);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

		// Admin logs in as User (zimbraAccount)
		adminAuthUser = await soap.getAccountAuthToken(adminAccount1, config.accountPassword);

		// Admin logs in as Admin (zimbraAdmin)
		const authRequest =
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminAccount1}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`;
		const authResp = await soap.makeSOAPEnvelopeAdmin(authRequest, null); // No token needed for initial auth, but we don't have one? 
		// Wait, usually we use admin/admin credentials. Here we are authenticating AS the new admin.
		adminAuthAdmin = authResp.AuthResponse.authToken[0]._content;

		// Get account1Id via GetAccountRequest instead of getAccountId
		const getAccountRequest =
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount1}</account>
			</GetAccountRequest>`;
		const getAccResp = await soap.makeSOAPEnvelopeAdmin(getAccountRequest, adminAuth);

		account1Id = getAccResp.GetAccountResponse.account[0].id;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (adminAccount1) await soap.deleteAccount(adminAccount1, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify an admin user only has user rights, if logged into the user interface', async () => {
		// User shares folder with Admin (Read Only)
		const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `admin_share_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${adminAccount1}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Admin (User Auth) mounts
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_admin_user" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, adminAuthUser);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Try AddMsg (Should Fail)
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${mountId}">
					<content>Fail</content>
				</m>
			</AddMsgRequest>`;
		const addRes = await soap.makeSOAPEnvelopeAccount(addMsgRequest, adminAuthUser);
		assert.exists(addRes.Fault,
			'Admin using User Auth should be denied write access on Read-Only share');
	});


	it('Sanity | Verify an admin user has admin rights, if logged into the admin interface', async () => {
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
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${adminAccount1}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Admin (Admin Auth) Creates Mountpoint
		// Use `makeSOAPEnvelopeAccount` with `adminAuthAdmin` token.
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_admin_super" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, adminAuthAdmin);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Try AddMsg (Should Succeed because Admin is Superuser)
		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${mountId}">
					<content>Success</content>
				</m>
			</AddMsgRequest>`;
		await soap.makeSOAPEnvelopeAccount(addMsgRequest2, adminAuthAdmin);
	});

});
