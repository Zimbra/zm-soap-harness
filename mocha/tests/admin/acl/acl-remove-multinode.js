import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > ACL > ACL Remove Multinode', function () {
	this.timeout(960 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account4Email;
	let acl1Name;
	let acl1Id;
	let folder1Id;
	let message1Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `account1.${common.getUniqueString()}@${config.testDomain}`;
		account4Email = `account4.${common.getUniqueString()}@${config.testDomain}`;
		acl1Name = `acl1.${common.getUniqueString()}@${config.testDomain}`;

		for (const email of [account1Email, account4Email]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.notExists(res.Fault, `CreateAccountRequest for ${email} should not fault`);
			if (email === account1Email) {
				const acct = Array.isArray(res.CreateAccountResponse.account)
					? res.CreateAccountResponse.account[0] : res.CreateAccountResponse.account;
				account1Id = acct.id;
			}
		}

		// Create DL (ACL1)
		const createDL = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${acl1Name}</name>
				<a n="description">An Access Control List</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(createDL.Fault, 'CreateDistributionListRequest should not fault');
		const dl = Array.isArray(createDL.CreateDistributionListResponse.dl)
			? createDL.CreateDistributionListResponse.dl[0] : createDL.CreateDistributionListResponse.dl;
		acl1Id = dl.id;

		// Auth as account1, create folder, add message, grant access to ACL1
		const token1 = await soap.getAccountAuthToken(account1Email);

		const folderName = `folder.${common.getUniqueString()}`;
		const createFolder = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, token1
		);
		assert.notExists(createFolder.Fault, 'CreateFolderRequest should not fault');
		const createdFolder = Array.isArray(createFolder.CreateFolderResponse.folder)
			? createFolder.CreateFolderResponse.folder[0] : createFolder.CreateFolderResponse.folder;
		folder1Id = createdFolder.id;

		const addMsg = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder1Id}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain

simple text string in the body</content>
				</m>
			</AddMsgRequest>`, token1
		);
		assert.notExists(addMsg.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addMsg.AddMsgResponse.m)
			? addMsg.AddMsgResponse.m[0] : addMsg.AddMsgResponse.m;
		message1Id = msg.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder1Id}">
					<grant gt="grp" d="${acl1Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, token1
		);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions — multinode only
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101_MULTINODE|ZIMBRAX/)) {
		return;
	}

	// Tests
	// SharingACLRemove_02a — Verify removed members lose access on multinode (Bug 9020)
	it('Functional | Verify that removed members of an ACL lose access on multinode with LDAP replication delay', async () => {
		// Add account4 to ACL1
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${account4Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes.Fault, 'AddDistributionListMemberRequest should not fault');

		// Verify account4 has access
		const token4 = await soap.getAccountAuthToken(account4Email);
		const getMsgBefore = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${message1Id}"/>
			</GetMsgRequest>`, token4
		);
		assert.notExists(getMsgBefore.Fault, 'GetMsgRequest should not fault before removal');
		assert.exists(getMsgBefore.GetMsgResponse, 'GetMsgResponse should exist before removal');

		// Remove account4 from ACL1
		const removeRes = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${account4Email}</dlm>
			</RemoveDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(removeRes.Fault, 'RemoveDistributionListMemberRequest should not fault');

		// Wait 15 minutes for LDAP replication on multinode
		await soap.waitFor(900000);

		// Re-auth as account4 and verify NO access
		const token4b = await soap.getAccountAuthToken(account4Email);
		const getMsgAfter = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${message1Id}"/>
			</GetMsgRequest>`, token4b, false
		);
		assert.exists(getMsgAfter.Fault, 'GetMsgRequest should fault for removed ACL member after LDAP replication');
		assert.include(getMsgAfter.Fault.Detail.Error.Code, 'service.PERM_DENIED');
	});
});
