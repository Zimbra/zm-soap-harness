import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharing Todomainadmin', function () {
	let testAccount1, domainAdminAccount;
	let auth1, adminAuthUser, adminAuthAdmin;
	let account1Id;

	before(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		testAccount1 = `da_share_user_${common.getUniqueString()}@${config.testDomain}`;
		domainAdminAccount = `da_admin_${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		account1Id = res1.accountId;

		// Create Domain Admin Account
		const createAccountRequest =
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${domainAdminAccount}</name>
				<password>${config.adminPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
				<a n="zimbraIsAdminAccount">FALSE</a>
			</CreateAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(createAccountRequest, adminAuth);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

		// Domain Admin logs in as User (zimbraAccount)
		adminAuthUser = await soap.getAccountAuthToken(domainAdminAccount, config.adminPassword);

		// Domain Admin logs in as Admin (zimbraAdmin)
		const authRequest =
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${domainAdminAccount}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`;
		const authResp = await soap.makeSOAPEnvelopeAdmin(authRequest, null);

		adminAuthAdmin = authResp.AuthResponse.authToken[0]._content;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (domainAdminAccount) await soap.deleteAccount(domainAdminAccount, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify an admin user only has user rights, if logged into the user interface', async () => {
		// User shares folder with DA (Read Only)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `da_user_share_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${domainAdminAccount}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// DA (User Auth) mounts
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_da_user" zid="${account1Id}" rid="${folderId}" view="message"/>
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
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(addMsgRequest, adminAuthUser);
		assert.exists(addMsgRes.Fault,
			'Domain Admin using User Auth should be denied write access on Read-Only share');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Sanity | Verify an admin user has admin rights, if logged into the admin interface', async () => {
		// Based on XML SharingFoldersToDomainAdmin_02, Domain Admins do NOT get implicit write access via Mountpoints if they only have Read access shared, even with Admin Auth.

		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `da_admin_share_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${domainAdminAccount}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// DA (Admin Auth) Creates Mountpoint
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_da_admin" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, adminAuthAdmin);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Try AddMsg (Should Fail per XML)
		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${mountId}">
					<content>Fail</content>
				</m>
			</AddMsgRequest>`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(addMsgRequest2, adminAuthAdmin);

		assert.exists(addMsgRes.Fault,
			'Domain Admin using Admin Auth should be denied write access on Read-Only share (per XML expectation)');
		assert.include(addMsgRes.Fault.Detail.Error.Code, 'PERM_DENIED',
			'Should return PERM_DENIED');
	});

});
