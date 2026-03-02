import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > ACL > ACL Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account3Email;
	let account4Email;
	let account5Email;
	let acl1Name;
	let acl1Id;
	let acl2Name;
	let folder1Id;
	let message1Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `account1.${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `account2.${common.getUniqueString()}@${config.testDomain}`;
		account3Email = `account3.${common.getUniqueString()}@${config.testDomain}`;
		account4Email = `account4.${common.getUniqueString()}@${config.testDomain}`;
		account5Email = `account5.${common.getUniqueString()}@${config.testDomain}`;
		acl1Name = `acl1.${common.getUniqueString()}@${config.testDomain}`;
		acl2Name = `acl2.${common.getUniqueString()}@${config.testDomain}`;

		for (const email of [account1Email, account2Email, account3Email, account4Email, account5Email]) {
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

		// Auth as account1 and create folder + message
		const acct1Token = await soap.getAccountAuthToken(account1Email);

		// Create subfolder under Inbox
		const folderName = `folder.${common.getUniqueString()}`;
		const createFolder = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, acct1Token
		);
		assert.notExists(createFolder.Fault, 'CreateFolderRequest should not fault');
		const createdFolder = Array.isArray(createFolder.CreateFolderResponse.folder)
			? createFolder.CreateFolderResponse.folder[0] : createFolder.CreateFolderResponse.folder;
		folder1Id = createdFolder.id;

		// Add a message to the folder
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
			</AddMsgRequest>`, acct1Token
		);
		assert.notExists(addMsg.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addMsg.AddMsgResponse.m)
			? addMsg.AddMsgResponse.m[0] : addMsg.AddMsgResponse.m;
		message1Id = msg.id;
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
	it('Sanity | Verify that existing members to an ACL inherit the access', async () => {
		// Create DL (ACL1) with account2 as member
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

		// Add account2 to ACL1
		const addMember = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${acl1Id}</id>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addMember.Fault, 'AddDistributionListMemberRequest should not fault');

		// Auth as account1 and grant folder access to ACL1
		const token1 = await soap.getAccountAuthToken(account1Email);
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder1Id}">
					<grant gt="grp" d="${acl1Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, token1
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Auth as account2 and verify access to shared folder
		const token2 = await soap.getAccountAuthToken(account2Email);
		const getMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${message1Id}"/>
			</GetMsgRequest>`, token2
		);
		assert.notExists(getMsg.Fault, 'GetMsgRequest should not fault for ACL member');
		assert.exists(getMsg.GetMsgResponse, 'GetMsgResponse should exist');
	});


	it('Sanity | Verify that all accounts in an ACL have the shared access', async () => {
		// Create DL (ACL2) with account3, account4, account5 as members
		const createDL = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${acl2Name}</name>
				<a n="description">An Access Control List</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(createDL.Fault, 'CreateDistributionListRequest should not fault');
		const dl = Array.isArray(createDL.CreateDistributionListResponse.dl)
			? createDL.CreateDistributionListResponse.dl[0] : createDL.CreateDistributionListResponse.dl;

		// Add 3 members at once
		const addMembers = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl.id}</id>
				<dlm>${account3Email}</dlm>
				<dlm>${account4Email}</dlm>
				<dlm>${account5Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addMembers.Fault, 'AddDistributionListMemberRequest should not fault');

		// Auth as account1 and grant folder access to ACL2
		const token1 = await soap.getAccountAuthToken(account1Email);
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder1Id}">
					<grant gt="grp" d="${acl2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, token1
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Verify each of the 3 accounts has access
		for (const email of [account3Email, account4Email, account5Email]) {
			const token = await soap.getAccountAuthToken(email);
			const getMsg = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${account1Id}:${message1Id}"/>
				</GetMsgRequest>`, token
			);
			assert.notExists(getMsg.Fault, `GetMsgRequest should not fault for ${email}`);
			assert.exists(getMsg.GetMsgResponse, `GetMsgResponse should exist for ${email}`);
		}
	});
});
