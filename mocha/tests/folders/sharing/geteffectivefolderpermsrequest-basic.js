import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Sharing > Geteffectivefolderpermsrequest Basic', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;
	let adminAuth;
	let folderId;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
		testAccount1 = `perms_owner_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `perms_sharee_${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount1}</account></GetAccountRequest>`, adminAuth
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		const acctInfoRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount2}</account></GetAccountRequest>`, adminAuth
		);
		assert.notExists(acctInfoRes2.Fault, 'GetAccountRequest should not fault');
		const acctInfo2 = Array.isArray(acctInfoRes2.GetAccountResponse.account)
			? acctInfoRes2.GetAccountResponse.account[0]
			: acctInfoRes2.GetAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
		account1Id = res1.accountId;

		// Create a folder for sharing
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `perms_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);

		folderId = createResp.CreateFolderResponse.folder[0].id;
	});

	after(async function () {
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	async function shareWithPerm(perm) {
		// Grant permission to testAccount2
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="${perm}"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Mount the folder for Account2
		const mountName = `mount_${perm}_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetEffectiveFolderPermsRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		return mountResp.CreateMountpointResponse.link[0].id;
	}

	async function getEffectivePerms(mountId) {
		const getEffectiveFolderPermsRequest =
			`<GetEffectiveFolderPermsRequest xmlns="urn:zimbraMail">
				<folder l="${mountId}"/>
			</GetEffectiveFolderPermsRequest>`;

		// FolderActionRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getEffectiveFolderPermsRequest, auth2);

		return resp;
	}

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify GetEffectiveFolderPermsRequest for read access', async () => {
		// Revoke existing grants first
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		const mountId = await shareWithPerm('r');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'r', 'Effective perms should include read');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for write access', async () => {
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		const mountId = await shareWithPerm('rw');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'w', 'Effective perms should include write');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for delete access', async () => {
		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		const mountId = await shareWithPerm('rd');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'd', 'Effective perms should include delete');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for insert access', async () => {
		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth1);

		const mountId = await shareWithPerm('ri');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'i', 'Effective perms should include insert');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for freebusy access', async () => {
		const folderActionRequest6 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest6, auth1);

		const mountId = await shareWithPerm('rf');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'f', 'Effective perms should include freebusy');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for workflow access', async () => {
		const folderActionRequest7 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest7, auth1);

		const mountId = await shareWithPerm('rwidx');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'w', 'Effective perms should include workflow rights');
		assert.include(perms, 'i', 'Effective perms should include insert');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for admin access', async () => {
		const folderActionRequest8 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest8, auth1);

		const mountId = await shareWithPerm('rwidxa');
		const resp = await getEffectivePerms(mountId);

		// Verify response
		const perms = resp.GetEffectiveFolderPermsResponse.folder[0].perm;

		// Verify response
		assert.include(perms, 'a', 'Effective perms should include admin');
	});


	it('Sanity | Verify GetEffectiveFolderPermsRequest for revoking the permission', async () => {
		const folderActionRequest9 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="revokeorphangrants" id="${folderId}"/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest9, auth1);

		// Grant first
		const folderActionRequest10 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest10, auth1);

		// Revoke
		const account2Id = (await soap.getAccount(adminAuth, testAccount2));
		const folderActionRequest11 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${account2Id}"/>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest11, auth1);

		// Try to mount after revoke - should fail or show no perms
		const mountName = `mount_revoked_${common.getUniqueString()}`;
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth2);
		// Mount after revoke should be denied
		assert.exists(mountResp.Fault.Detail.Error,
			'Fault Error should exist - mount should be denied after revoking permission');
	});

});
