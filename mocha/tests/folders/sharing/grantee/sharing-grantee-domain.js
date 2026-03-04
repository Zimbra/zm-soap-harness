import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Folders > Sharing > Grantee > Sharing Grantee Domain', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;

	before(async function () {
		await main.before(this);
		testAccount1 = `grant_dom1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `grant_dom2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
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
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
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
	it('Smoke | Share a folder to a domain. Verify that all users in that domain have access.', async () => {
		// Setup Folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `grant_dom_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Domain
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="dom" d="${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify user in same domain (Account2) can access
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_dom" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Domain grant should allow user in same domain to mount');
	});


	it('Sanity | Unshare a folder to all. Verify that all users have access.', async () => {
		// Create folder
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `revoke_dom_${common.getUniqueString()}`;
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
					Subject: test_revoke_dom
					MIME-Version: 1.0
					Content-Type: text/plain
					Test message for revoke domain test
				</content>
			</m>
			</AddMsgRequest>`;

		// GetDomainRequest
		const addMsg = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);
		const msgId = addMsg.AddMsgResponse.m[0].id;

		// Share with Domain
		const adminAuth = await soap.getAdminAuthToken();
		const getDomainRequest =
			`<GetDomainRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</GetDomainRequest>`;

		// FolderActionRequest
		const getDomain = await soap.makeSOAPEnvelopeAdmin(getDomainRequest, adminAuth);
		const domainId = getDomain.GetDomainResponse.domain[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="dom" d="${config.testDomain}" perm="rwidx"/>
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
		assert.exists(accessCheck.GetMsgResponse.m,
			'Domain user should have access before revoke');

		// Revoke the grant
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${domainId}"/>
			</FolderActionRequest>`;

		// GetMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Verify access denied
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const revokedCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest2, auth2);

		// Verify response
		assert.exists(revokedCheck.Fault.Detail.Error, 'Fault Error should exist - Domain user should be denied after revoke');
	});

});
