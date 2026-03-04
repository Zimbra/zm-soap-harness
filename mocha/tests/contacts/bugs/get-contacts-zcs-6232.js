import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Get Contacts ZCS 6232', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let user1Email, user2Email, user3Email, user4Email;
	let dlName, dlId;
	let user1Token, user2Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test domain
		const domainName = `${common.getUniqueString()}.zcs6232.com`;

		// Create account1 (admin-level) to get zimbraMailHost
		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create 4 user accounts for DL members
		user1Email = `user1_${common.getUniqueString()}@${config.testDomain}`;
		const user1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${user1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(user1Res.Fault, 'CreateAccount user1 should not fault');
		const user1Acct = Array.isArray(user1Res.CreateAccountResponse.account)
			? user1Res.CreateAccountResponse.account[0] : user1Res.CreateAccountResponse.account;
		assert.exists(user1Acct.id, 'User1 account ID should exist');

		user2Email = `user2_${common.getUniqueString()}@${config.testDomain}`;
		const user2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${user2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(user2Res.Fault, 'CreateAccount user2 should not fault');
		const user2Acct = Array.isArray(user2Res.CreateAccountResponse.account)
			? user2Res.CreateAccountResponse.account[0] : user2Res.CreateAccountResponse.account;
		assert.exists(user2Acct.id, 'User2 account ID should exist');

		user3Email = `user3_${common.getUniqueString()}@${config.testDomain}`;
		const user3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${user3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(user3Res.Fault, 'CreateAccount user3 should not fault');
		const user3Acct = Array.isArray(user3Res.CreateAccountResponse.account)
			? user3Res.CreateAccountResponse.account[0] : user3Res.CreateAccountResponse.account;
		assert.exists(user3Acct.id, 'User3 account ID should exist');

		user4Email = `user4_${common.getUniqueString()}@${config.testDomain}`;
		const user4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${user4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(user4Res.Fault, 'CreateAccount user4 should not fault');
		const user4Acct = Array.isArray(user4Res.CreateAccountResponse.account)
			? user4Res.CreateAccountResponse.account[0] : user4Res.CreateAccountResponse.account;
		assert.exists(user4Acct.id, 'User4 account ID should exist');

		dlName = `dl${common.getUniqueString()}@${config.testDomain}`;

		// Get auth tokens for user1 and user2
		user1Token = await soap.getAccountAuthToken(user1Email);
		user2Token = await soap.getAccountAuthToken(user2Email);
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
	it('Sanity | Create DL and add members', async () => {
		// Create distribution list
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse.dl;
		assert.exists(dl.id, 'DL id should exist');
		dlId = dl.id;

		// Add user1 as member
		const addRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${user1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMember user1 should not be a Fault');
		assert.notExists(addRes1.Fault, 'AddDistributionListMemberResponse should exist');

		// Add user2 as member
		const addRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${user2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMember user2 should not be a Fault');
		assert.notExists(addRes2.Fault, 'AddDistributionListMemberResponse should exist');

		// Add user3 as member
		const addRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${user3Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes3.Fault, 'AddMember user3 should not be a Fault');
		assert.notExists(addRes3.Fault, 'AddDistributionListMemberResponse should exist');

		// Add user4 as member
		const addRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${user4Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes4.Fault, 'AddMember user4 should not be a Fault');
		assert.notExists(addRes4.Fault, 'AddDistributionListMemberResponse should exist');
	});


	it('Regression | Denying viewDistList hides members from GetContactsResponse', async () => {
		// Deny viewDistList right to user1
		const denyRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="dl">${dlName}</target>
				<grantee by="name" type="usr">${user1Email}</grantee>
				<right deny="1">viewDistList</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(denyRes.Fault, 'GrantRight deny should not fault');
		assert.notExists(denyRes.Fault, 'GrantRightResponse should exist');

		// Allow viewDistList right to user2
		const allowRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="dl">${dlName}</target>
				<grantee by="name" type="usr">${user2Email}</grantee>
				<right>viewDistList</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(allowRes.Fault, 'GrantRight allow should not fault');
		assert.notExists(allowRes.Fault, 'GrantRightResponse should exist');

		// SyncGal as user1 to get dl id
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="true"/>`, user1Token
		);
		assert.notExists(syncRes1.Fault, 'SyncGalRequest should not fault');
		assert.notExists(syncRes1.Fault, 'SyncGalResponse should exist');

		// Find the DL in sync results
		const cnArr = Array.isArray(syncRes1.SyncGalResponse.cn)
			? syncRes1.SyncGalResponse.cn : [syncRes1.SyncGalResponse.cn];
		const dlCn = cnArr.find(cn => cn && cn.id);
		assert.exists(dlCn, 'DL contact should exist in SyncGal response');
		const dlSyncId = dlCn.id;

		// GetContacts as user1 (denied) — members should be hidden
		const getRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" sync="1" returnHiddenAttrs="1" maxMembers="100">
				<cn id="${dlSyncId}"/>
			</GetContactsRequest>`, user1Token
		);
		assert.notExists(getRes1.Fault, 'GetContactsRequest user1 should not fault');
		assert.notExists(getRes1.Fault, 'GetContactsResponse should exist');

		// SyncGal as user1 with idOnly=false — members should be hidden
		const syncRes1b = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="false"/>`, user1Token
		);
		assert.notExists(syncRes1b.Fault, 'SyncGalRequest idOnly=false should not fault');
		assert.notExists(syncRes1b.Fault, 'SyncGalResponse should exist');

		// GetContacts as user2 (allowed) — members should be visible
		const getRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" sync="1" returnHiddenAttrs="1" maxMembers="100">
				<cn id="${dlSyncId}"/>
			</GetContactsRequest>`, user2Token
		);
		assert.notExists(getRes2.Fault, 'GetContactsRequest user2 should not fault');
		assert.notExists(getRes2.Fault, 'GetContactsResponse should exist');

		// SyncGal as user2 with idOnly=false — members should be visible
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="false"/>`, user2Token
		);
		assert.notExists(syncRes2.Fault, 'SyncGalRequest user2 should not fault');
		assert.notExists(syncRes2.Fault, 'SyncGalResponse should exist');
	});
});
