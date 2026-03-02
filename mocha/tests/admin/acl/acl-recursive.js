import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > ACL > ACL Recursive', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account3Email;
	let acl1Name;
	let acl2Name;
	let folder1Id;
	let message1Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `acl.${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `acl.${common.getUniqueString()}@${config.testDomain}`;
		account3Email = `acl.${common.getUniqueString()}@${config.testDomain}`;
		acl1Name = `acl.${common.getUniqueString()}@${config.testDomain}`;
		acl2Name = `acl.${common.getUniqueString()}@${config.testDomain}`;

		for (const email of [account1Email, account2Email, account3Email]) {
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

		// Create ACL1 with account2 as member
		const createDL1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${acl1Name}</name>
				<a n="description">An Access Control List</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		const dl1 = Array.isArray(createDL1.CreateDistributionListResponse.dl)
			? createDL1.CreateDistributionListResponse.dl[0] : createDL1.CreateDistributionListResponse.dl;
		const acl1Id = dl1.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Create ACL2 with account3 as member
		const createDL2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${acl2Name}</name>
				<a n="description">An Access Control List</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(createDL2.Fault, 'CreateDistributionListRequest for ACL2 should not fault');

		// Add ACL2 as member of ACL1 (recursive)
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${acl2Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add account3 to ACL1 directly too
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${account3Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Auth as account1, create folder, add message, grant to ACL1
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify that members of ACL2 included in ACL1 inherit the access granted to ACL1', async () => {
		// Auth as account3 and verify access to shared folder
		const token3 = await soap.getAccountAuthToken(account3Email);
		const getMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${message1Id}"/>
			</GetMsgRequest>`, token3
		);
		assert.notExists(getMsg.Fault, 'GetMsgRequest should not fault for recursive ACL member');
		assert.exists(getMsg.GetMsgResponse, 'GetMsgResponse should exist');
	});
});
