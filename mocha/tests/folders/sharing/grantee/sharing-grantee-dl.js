import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Folders > Sharing > Grantee > Sharing Grantee DL', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;
	let dlId;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Verify that a folder can be delegated to a distribution list', async () => {
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `grant_dl_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// CreateDistributionListRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Create DL and add testAccount2
		const dlName = `dl_${common.getUniqueString()}@${config.testDomain}`;
		const adminAuth = await soap.getAdminAuthToken();
		const createDistributionListRequest =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`;

		// AddDistributionListMemberRequest
		const createDl = await soap.makeSOAPEnvelopeAdmin(createDistributionListRequest, adminAuth);

		dlId = createDl.CreateDistributionListResponse.dl[0].id;

		const addDistributionListMemberRequest =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${testAccount2}</dlm>
			</AddDistributionListMemberRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAdmin(addDistributionListMemberRequest, adminAuth);

		// Share with DL
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="grp" d="${dlName}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify Account2 (member) can access
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_dl" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'DL member should be able to mount folder');
	});


	it('Sanity | Unshare a folder to a DL. Verify that DL users no longer have access.', async () => {
		// Create folder
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `revoke_dl_${common.getUniqueString()}`;
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
					Subject: test_revoke_dl
					MIME-Version: 1.0
					Content-Type: text/plain
					Test message for revoke dl test
				</content>
			</m>
			</AddMsgRequest>`;

		// CreateDistributionListRequest
		const addMsg = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);
		const msgId = addMsg.AddMsgResponse.m[0].id;

		// Create another DL and add testAccount2
		const dlName2 = `dl_rev_${common.getUniqueString()}@${config.testDomain}`;
		const adminAuth = await soap.getAdminAuthToken();
		const createDistributionListRequest2 =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName2}</name>
			</CreateDistributionListRequest>`;

		// AddDistributionListMemberRequest
		const createDl2 = await soap.makeSOAPEnvelopeAdmin(createDistributionListRequest2, adminAuth);
		const dl2Id = createDl2.CreateDistributionListResponse.dl[0].id;

		const addDistributionListMemberRequest2 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl2Id}</id>
				<dlm>${testAccount2}</dlm>
			</AddDistributionListMemberRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAdmin(addDistributionListMemberRequest2, adminAuth);

		// Share with DL
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="grp" d="${dlName2}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;

		// GetMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Verify access works
		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// FolderActionRequest
		const accessCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest, auth2);

		// Verify response
		assert.exists(accessCheck.GetMsgResponse.m, 'DL member should have access before revoke');

		// Revoke the grant
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${dl2Id}"/>
			</FolderActionRequest>`;

		// GetMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Verify access denied
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// DeleteDistributionListRequest
		const revokedCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest2, auth2);

		// Verify response
		assert.exists(revokedCheck.Fault.Detail.Error, 'Fault Error should exist - DL member should be denied after revoke');

		// Cleanup DL
		const deleteDistributionListRequest =
			`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${dl2Id}</id>
			</DeleteDistributionListRequest>`;

		// CreateDistributionListRequest
		await soap.makeSOAPEnvelopeAdmin(deleteDistributionListRequest, adminAuth);
	});


	it('Functional | Share a folder to a DL. Verify that DL users have access.', async () => {
		const adminAuth = await soap.getAdminAuthToken();

		// Create inner DL with testAccount2
		const innerDlName = `dl_inner_${common.getUniqueString()}@${config.testDomain}`;
		const createDistributionListRequest3 =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${innerDlName}</name>
			</CreateDistributionListRequest>`;

		// AddDistributionListMemberRequest
		const innerDlResp = await soap.makeSOAPEnvelopeAdmin(createDistributionListRequest3, adminAuth);
		const innerDlId = innerDlResp.CreateDistributionListResponse.dl[0].id;

		const addDistributionListMemberRequest3 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${innerDlId}</id>
				<dlm>${testAccount2}</dlm>
			</AddDistributionListMemberRequest>`;

		// CreateDistributionListRequest
		await soap.makeSOAPEnvelopeAdmin(addDistributionListMemberRequest3, adminAuth);

		// Create outer DL containing inner DL
		const outerDlName = `dl_outer_${common.getUniqueString()}@${config.testDomain}`;
		const createDistributionListRequest4 =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${outerDlName}</name>
			</CreateDistributionListRequest>`;

		// AddDistributionListMemberRequest
		const outerDlResp = await soap.makeSOAPEnvelopeAdmin(createDistributionListRequest4, adminAuth);
		const outerDlId = outerDlResp.CreateDistributionListResponse.dl[0].id;

		const addDistributionListMemberRequest4 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${outerDlId}</id>
				<dlm>${innerDlName}</dlm>
			</AddDistributionListMemberRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAdmin(addDistributionListMemberRequest4, adminAuth);

		// Create a folder and share with outer DL
		const getFolderRequest3 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `nested_dl_${common.getUniqueString()}`;
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Date: Mon, 1 Jan 2024 12:00:00 -0800
					From: foo@example.com
					To: bar@example.com
					Subject: test_nested_dl
					MIME-Version: 1.0
					Content-Type: text/plain
					Test message for nested DL
				</content>
			</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest2, auth1);

		// Share with outer DL
		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="grp" d="${outerDlName}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		// Verify Account2 (inner DL member) can access via mountpoint
		const mountName = `mount_nested_dl_${common.getUniqueString()}`;
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// DeleteDistributionListRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Nested DL member should be able to mount folder');

		// Cleanup
		const deleteDistributionListRequest2 =
			`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${innerDlId}</id>
			</DeleteDistributionListRequest>`;

		// DeleteDistributionListRequest
		await soap.makeSOAPEnvelopeAdmin(deleteDistributionListRequest2, adminAuth);

		const deleteDistributionListRequest3 =
			`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${outerDlId}</id>
			</DeleteDistributionListRequest>`;
		await soap.makeSOAPEnvelopeAdmin(deleteDistributionListRequest3, adminAuth);
	});

});
