import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Hab > ZCS 5397 Get Hab Groups', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	let domainId;
	const uid = common.getUniqueString();
	const domainName = `test${uid}.com`;
	const ou1Name = `ZimbraOU${uid}`;
	const habNotes = 'Group created notes';
	let habGroup1Id, habGroup2Id, habGroup3Id, habGroup4Id, habGroup5Id, habGroup6Id, habGroup7Id;
	const group1Name = `grouphab1_${uid}`;
	const group2Name = `grouphab2_${uid}`;
	const group3Name = `grouphab3_${uid}`;
	const group4Name = `grouphab4_${uid}`;
	const group5Name = `grouphabx5_${uid}`;
	const group6Name = `grouphab6_${uid}`;
	const group7Name = `grouphaby7_${uid}`;
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
	it.skip('Sanity | Create a new HAB group and link it to existing OU', async () => {
		// Create HAB OU
		const ouRes = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou1Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.notExists(ouRes.Fault, 'HABOrgUnitRequest should not fault');

		// Create HAB groups (7 groups)
		const groupConfigs = [
			{ name: group1Name, addr: group1, dynamic: false },
			{ name: group2Name, addr: group2, dynamic: false },
			{ name: group3Name, addr: group3, dynamic: false },
			{ name: group4Name, addr: group4, dynamic: false },
			{ name: group5Name, addr: group5, dynamic: false },
			{ name: group6Name, addr: group6, dynamic: false },
			{ name: group7Name, addr: group7, dynamic: true }
		];

		for (const g of groupConfigs) {
			const dynamicAttr = g.dynamic ? `dynamic="1"` : '';
			const memberUrl = g.dynamic
				? `<a n="memberURL">ldap:///??sub?(mail=test*@${domainName})</a>` : '';
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateHABGroupRequest habDisplayName="${g.name}"
					habOrgUnit="${ou1Name}" name="${g.addr}" ${dynamicAttr}
					xmlns="urn:zimbraAdmin">
					<a n="zimbraNotes">${habNotes}</a>
					${memberUrl}
				</CreateHABGroupRequest>`, adminAuthToken
			);
			assert.notExists(res.Fault, `CreateHABGroupRequest for ${g.name} should not fault`);
			const dl = Array.isArray(res.CreateHABGroupResponse?.dl)
				? res.CreateHABGroupResponse.dl[0] : res.CreateHABGroupResponse?.dl;
			if (g.addr === group1) habGroup1Id = dl?.id;
			if (g.addr === group2) habGroup2Id = dl?.id;
			if (g.addr === group3) habGroup3Id = dl?.id;
			if (g.addr === group4) habGroup4Id = dl?.id;
			if (g.addr === group5) habGroup5Id = dl?.id;
			if (g.addr === group6) habGroup6Id = dl?.id;
			if (g.addr === group7) habGroup7Id = dl?.id;
		}

		// Set HAB root
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domainId}</id>
				<a n="zimbraHierarchicalAddressBookRoot">${group1}</a>
			</ModifyDomainRequest>`, adminAuthToken
		);

		// Set seniority indices
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup7Id}</id>
				<a n="zimbraHABSeniorityIndex">80</a>
			</ModifyDistributionListRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup5Id}</id>
				<a n="zimbraHABSeniorityIndex">40</a>
			</ModifyDistributionListRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup6Id}</id>
				<a n="zimbraHABSeniorityIndex">80</a>
			</ModifyDistributionListRequest>`, adminAuthToken
		);
	});


	it.skip('Sanity | Fire GetHABRequest to get the groups added', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup1Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest should not fault');
	});


	it.skip('Sanity | Add members to groups and verify the groups get returned in tree fashion', async () => {
		// Add group2 and group4 to group1
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup1Id}</id>
				<dlm>${group2}</dlm>
				<dlm>${group4}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add group3 to group2
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup2Id}</id>
				<dlm>${group3}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add group5 to group4
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup4Id}</id>
				<dlm>${group5}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add group6 to group5
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup5Id}</id>
				<dlm>${group6}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Add group7 and group6 to group4
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup4Id}</id>
				<dlm>${group7}</dlm>
				<dlm>${group6}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Verify tree structure
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup1Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest should not fault');
	});


	it.skip('Sanity | Fire GetHABRequest for any group within the hierarchy', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup5Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest for group5 should not fault');
	});


	it.skip('Sanity | Fire GetHABRequest for individual members in the group', async () => {
		// Add individual member to group2
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup2Id}</id>
				<dlm>${account2Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup2Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest for group2 should not fault');
	});


	it.skip('Sanity | Fire GetHABRequest after deleting a group from the group', async () => {
		// Delete group3
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${habGroup3Id}</id>
			</DeleteDistributionListRequest>`, adminAuthToken
		);

		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup2Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest after delete should not fault');
	});


	it('Sanity | Fire GetHABRequest for a non existent group', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup3Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		// Should fault since group3 was deleted
		assert.isString(habRes.Fault.Detail.Error.Code, 'GetHABRequest for deleted group should fault');
	});


	it.skip('Sanity | GetHabGroup request based on seniority index', async () => {
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup4Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest for group4 should not fault');
	});


	it('Sanity | GetHabGroup request for a non hab Group', async () => {
		// Create a non-HAB distribution list
		const dlName = `nonhab${uid}@${domainName}`;
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDistributionListRequest should not fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse?.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse?.dl;

		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${dl?.id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		// Should fault since the DL is not an HAB group
		assert.isString(habRes.Fault.Detail.Error.Code, 'GetHABRequest for non-HAB group should fault');
	});


	it.skip('Sanity | GetHabGroup request for groups with seniority across sub-levels', async () => {
		// Source: GetStaticHABGroups_8 from HAB/ZCS-5397_GetHABGroups.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup1Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest should not fault');
	});


	it.skip('Sanity | GetHabGroup verify seniority index ordering in nested groups', async () => {
		// Source: GetStaticHABGroups_9 (duplicate) from HAB/ZCS-5397_GetHABGroups.xml
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const habRes = await soap.makeSOAPEnvelopeAccount(
			`<GetHABRequest habRootGroupId="${habGroup4Id}"
				xmlns="urn:zimbraAccount"/>`, acct1Auth
		);
		assert.notExists(habRes.Fault, 'GetHABRequest for seniority should not fault');
	});
});
