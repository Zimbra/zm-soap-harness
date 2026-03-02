import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Folders > Sharing > Grantee > Sharing Grantee COS', function () {
	let testAccount1, cosAccount;
	let auth1, cosAuth;
	let account1Id;
	let cosId;

	before(async function () {
		await main.before(this);
		testAccount1 = `grant_cos1_${common.getUniqueString()}@${config.testDomain}`;
		cosAccount = `cos_user_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		account1Id = res1.accountId;

		// Create COS
		const cosName = `cos_${common.getUniqueString()}`;
		const createCosRequest =
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`;

		// ModifyAccountRequest
		const createCos = await soap.makeSOAPEnvelopeAdmin(createCosRequest, adminAuth);

		cosId = createCos.CreateCosResponse.cos[0].id;

		// Create Account in COS
		// We create it first then modify COS because `createAccountByNameAndEmailAddress` helper might limit options.
		// Or we use createAccount directly. Let's use helper then modify.
		const cosAccRes = await soap.createAccountByNameAndEmailAddress(adminAuth, cosAccount, cosAccount);
		const accId = cosAccRes.accountId;
		const modifyAccountRequest =
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accId}</id>
				<a n="zimbraCOSId">${cosId}</a>
			</ModifyAccountRequest>`;

		// DeleteCosRequest
		await soap.makeSOAPEnvelopeAdmin(modifyAccountRequest, adminAuth);

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

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Share a folder to a COS. Verify that COS users have access.', async function () {
		// Setup Folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `grant_cos_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with COS
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="cos" d="${this.cosName}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify COS user can access
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_cos" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, cosAuth);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'COS member should be able to mount folder');
	});


	it('Sanity | Unshare a folder to a COS. Verify that COS users no longer have access.', async function () {
		// Create folder
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `revoke_cos_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Date: Mon, 1 Jan 2024 12:00:00 -0800
					From: foo@example.com
					To: bar@example.com
					Subject: test_revoke_cos
					MIME-Version: 1.0
					Content-Type: text/plain
					Test message for revoke cos test
				</content>
			</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addMsg = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);
		const msgId = addMsg.AddMsgResponse.m[0].id;

		// Share with COS
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="cos" d="${this.cosName}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;

		// GetMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Verify COS user has access
		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// FolderActionRequest
		const accessCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest, cosAuth);

		// Verify response
		assert.notExists(accessCheck.Fault,
			'COS member should have access before revoke');

		// Revoke the grant
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${cosId}"/>
			</FolderActionRequest>`;

		// GetMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Verify access denied
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const revokedCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest2, cosAuth);

		// Verify response
		assert.exists(revokedCheck.Fault, 'COS member should be denied after revoke');
	});

});
