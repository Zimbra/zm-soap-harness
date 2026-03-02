import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Hab > ZCS 5709 Get Distribution List Members', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domainName = `test${uid}.com`;
	let domainId;
	const ou1Name = `ZimbraOU${uid}`;
	let account1Name, account2Name, account3Name, account4Name, account5Name, account6Name;
	let account6Id;
	let habGroup1Id, habGroup2Id, habGroup3Id, habGroup4Id, habGroup5Id, habGroup6Id, habGroup7Id;
	const group1Name = `grouphab1${uid}`;
	const group2Name = `grouphab2${uid}`;
	const group3Name = `grouphab3${uid}`;
	const group4Name = `grouphab4${uid}`;
	const group5Name = `grouphab5${uid}`;
	const group6Name = `grouphab6${uid}`;
	const group7Name = `grouphab7${uid}`;
	const group1 = `${group1Name}@${domainName}`;
	const group2 = `${group2Name}@${domainName}`;
	const group3 = `${group3Name}@${domainName}`;
	const group4 = `${group4Name}@${domainName}`;
	const group5 = `${group5Name}@${domainName}`;
	const group6 = `${group6Name}@${domainName}`;
	const group7 = `${group7Name}@${domainName}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `test1${uid}@${domainName}`;
		account2Name = `test2${uid}@${domainName}`;
		account3Name = `testv3${uid}@${domainName}`;
		account4Name = `test4${uid}@${domainName}`;
		account5Name = `testa5${uid}@${domainName}`;
		account6Name = `test6${uid}@${domainName}`;

		// Create domain
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">test of adding an OU</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		const dom = Array.isArray(domRes.CreateDomainResponse?.domain)
			? domRes.CreateDomainResponse.domain[0] : domRes.CreateDomainResponse?.domain;
		domainId = dom?.id;

		// Create accounts
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHABSeniorityIndex">30</a>
				<a n="givenName">acct3</a>
				<a n="displayName">display_acct3</a>
				<a n="company">Company3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHABSeniorityIndex">80</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHABSeniorityIndex">30</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct6Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct6 = Array.isArray(acct6Res.CreateAccountResponse?.account)
			? acct6Res.CreateAccountResponse.account[0] : acct6Res.CreateAccountResponse?.account;
		account6Id = acct6?.id;

		// Create OU
		await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou1Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);

		// Create all 7 groups (group1 through group6 are static, group7 is dynamic)
		const staticGroups = [
			{ name: group1Name, addr: group1 },
			{ name: group2Name, addr: group2 },
			{ name: group3Name, addr: group3 },
			{ name: group4Name, addr: group4 },
			{ name: group5Name, addr: group5 },
			{ name: group6Name, addr: group6 }
		];

		for (const g of staticGroups) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateHABGroupRequest habDisplayName="${g.name}"
					habOrgUnit="${ou1Name}" name="${g.addr}" xmlns="urn:zimbraAdmin">
					<a n="zimbraNotes">Group created notes</a>
				</CreateHABGroupRequest>`, adminAuthToken
			);
			const dl = Array.isArray(res.CreateHABGroupResponse?.dl)
				? res.CreateHABGroupResponse.dl[0] : res.CreateHABGroupResponse?.dl;
			if (g.addr === group1) habGroup1Id = dl?.id;
			if (g.addr === group2) habGroup2Id = dl?.id;
			if (g.addr === group3) habGroup3Id = dl?.id;
			if (g.addr === group4) habGroup4Id = dl?.id;
			if (g.addr === group5) habGroup5Id = dl?.id;
			if (g.addr === group6) habGroup6Id = dl?.id;
		}

		// Create dynamic group7
		const g7Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${group7Name}"
				habOrgUnit="${ou1Name}" name="${group7}" dynamic="1" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">Group created notes</a>
				<a n="memberURL">ldap:///??sub?(mail=test*@${domainName})</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		const dl7 = Array.isArray(g7Res.CreateHABGroupResponse?.dl)
			? g7Res.CreateHABGroupResponse.dl[0] : g7Res.CreateHABGroupResponse?.dl;
		habGroup7Id = dl7?.id;

		// Set HAB root
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domainId}</id>
				<a n="zimbraHierarchicalAddressBookRoot">${group1Name}</a>
			</ModifyDomainRequest>`, adminAuthToken
		);

		// Add groups to root group1: group2, group3, group7
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup1Id}</id>
				<dlm>${group2}</dlm>
				<dlm>${group3}</dlm>
				<dlm>${group7}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add accounts to group2: acct3, acct4
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup2Id}</id>
				<dlm>${account3Name}</dlm>
				<dlm>${account4Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add group4 to group3
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup3Id}</id>
				<dlm>${group4}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add accounts to group5: acct5, acct4, acct3
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup5Id}</id>
				<dlm>${account5Name}</dlm>
				<dlm>${account4Name}</dlm>
				<dlm>${account3Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Set seniority for group7
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup7Id}</id>
				<a n="zimbraHABSeniorityIndex">70</a>
			</ModifyDistributionListRequest>`, adminAuthToken
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
	it('Sanity | Create OU and HAB groups for GetDistributionListMembers testing', async () => {
		// Source: CreateOUAndHABGroups from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', acct1Auth
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of individual members', async () => {
		// Source: GetHABMembers_01 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group2}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const groupMembers = res.GetDistributionListMembersResponse?.groupMembers;
		const members = Array.isArray(groupMembers?.groupMember)
			? groupMembers.groupMember : [groupMembers?.groupMember].filter(Boolean);
		assert.isAtLeast(members.length, 2, 'Should have at least 2 members');
		assert.equal(members[0]?.name, account4Name, 'First member should be acct4 (seniority 80)');
		assert.equal(members[1]?.name, account3Name, 'Second member should be acct3 (seniority 30)');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of members for root group', async () => {
		// Source: GetHABMembers_02 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group1}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const total = res.GetDistributionListMembersResponse?.total;
		assert.equal(String(total), '0', 'Root group should have total 0 individual members');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest for group with no members', async () => {
		// Source: GetHABMembers_03 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group6}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const total = res.GetDistributionListMembersResponse?.total;
		assert.equal(String(total), '0', 'Group6 should have total 0 members');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of members from dynamic group', async () => {
		// Source: GetHABMembers_04 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group7}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const groupMembers = res.GetDistributionListMembersResponse?.groupMembers;
		const members = Array.isArray(groupMembers?.groupMember)
			? groupMembers.groupMember : [groupMembers?.groupMember].filter(Boolean);
		assert.isAtLeast(members.length, 5, 'Dynamic group should have at least 5 members');
		assert.equal(members[0]?.name, account4Name, 'First member should be acct4');
		assert.equal(members[1]?.name, account5Name, 'Second member should be acct5');
		assert.equal(members[2]?.name, account3Name, 'Third member should be acct3');
		assert.equal(members[3]?.name, account1Name, 'Fourth member should be acct1');
		assert.equal(members[4]?.name, account6Name, 'Fifth member should be acct6');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of members from static group based on seniority index', async () => {
		// Source: GetHABMembers_05 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group5}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const groupMembers = res.GetDistributionListMembersResponse?.groupMembers;
		const members = Array.isArray(groupMembers?.groupMember)
			? groupMembers.groupMember : [groupMembers?.groupMember].filter(Boolean);
		assert.isAtLeast(members.length, 3, 'Group5 should have at least 3 members');
		assert.equal(members[0]?.name, account4Name, 'First member should be acct4 (seniority 80)');
		assert.equal(members[1]?.name, account5Name, 'Second member should be acct5 (seniority 30)');
		assert.equal(members[2]?.name, account3Name, 'Third member should be acct3 (seniority 30)');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of members from static group with limit 1', async () => {
		// Source: GetHABMembers_06 from HAB/ZCS-5709_GetDistributionListMembers.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount" limit="1">
				<dl>${group5}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const groupMembers = res.GetDistributionListMembersResponse?.groupMembers;
		const members = Array.isArray(groupMembers?.groupMember)
			? groupMembers.groupMember : [groupMembers?.groupMember].filter(Boolean);
		assert.equal(members.length, 1, 'Should return exactly 1 member with limit 1');
		assert.equal(members[0]?.name, account4Name, 'Member should be acct4 (seniority 80)');
	});


	it.skip('Sanity | Fire GetDistributionListMemberrequest to get the list of members with same seniority index', async () => {
		// Source: GetHABMembers_07 from HAB/ZCS-5709_GetDistributionListMembers.xml
		// Modify acct6 seniority to 30
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account6Id}</id>
				<a n="zimbraHABSeniorityIndex">30</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetDistributionListMembersRequest xmlns="urn:zimbraAccount">
				<dl>${group7}</dl>
			</GetDistributionListMembersRequest>`, acct1Auth
		);
		assert.notExists(res.Fault, 'GetDistributionListMembersRequest should not fault');
		assert.exists(res.GetDistributionListMembersResponse, 'Response should exist');
		const groupMembers = res.GetDistributionListMembersResponse?.groupMembers;
		const members = Array.isArray(groupMembers?.groupMember)
			? groupMembers.groupMember : [groupMembers?.groupMember].filter(Boolean);
		assert.isAtLeast(members.length, 5, 'Should have at least 5 members');
		assert.equal(members[0]?.name, account4Name, 'First member should be acct4 (seniority 80)');
		assert.equal(members[1]?.name, account6Name, 'Second member should be acct6 (seniority 30, sorted alpha)');
		assert.equal(members[2]?.name, account5Name, 'Third member should be acct5 (seniority 30, sorted alpha)');
		assert.equal(members[3]?.name, account3Name, 'Fourth member should be acct3 (seniority 30, sorted alpha)');
		assert.equal(members[4]?.name, account1Name, 'Fifth member should be acct1 (no seniority)');
	});
});
