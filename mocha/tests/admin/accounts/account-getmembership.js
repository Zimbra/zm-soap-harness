import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Getmembership', function () {
	let adminAuthToken;
	let domainName;
	let account1, account2, account3, account4, account5;
	let account1Id, account2Id, account3Id, account4Id, account5Id;
	let list1Id, list1Name, list2Id, list2Name, list3Id, list3Name;
	let list4Id, list4Name, list5Id, list5Name;
	let list6Id, list6Name, list7Id, list7Name, list8Id, list8Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		const ts = common.getUniqueString();
		domainName = `dl.com${ts}`;
		account1 = `account1@${domainName}`;
		account2 = `account2@${domainName}`;
		account3 = `account3@${domainName}`;
		account4 = `account4@${domainName}`;
		account5 = `account5@${domainName}`;

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">Domain for GetAccountMembershipRequest testing</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create DLs 1, 2, 3
		const dl1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist1@${domainName}</name>
				<a n="description">A test distribution list1</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list1Id = dl1Res.CreateDistributionListResponse.dl[0].id;
		list1Name = dl1Res.CreateDistributionListResponse.dl[0].name;

		const dl2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist2@${domainName}</name>
				<a n="description">A test distribution list2</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list2Id = dl2Res.CreateDistributionListResponse.dl[0].id;
		list2Name = dl2Res.CreateDistributionListResponse.dl[0].name;

		const dl3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist3@${domainName}</name>
				<a n="description">A test distribution list3</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list3Id = dl3Res.CreateDistributionListResponse.dl[0].id;
		list3Name = dl3Res.CreateDistributionListResponse.dl[0].name;

		// Add account1 to list1 (before account1 is created as a user account)
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list1Id}</id>
				<dlm>${account1}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Create accounts 1-3
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Id = a1.CreateAccountResponse.account[0].id;

		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Id = a2.CreateAccountResponse.account[0].id;

		const a3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account3Id = a3.CreateAccountResponse.account[0].id;

		// Add account2 to list1
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list1Id}</id>
				<dlm>${account2}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Setup 2: account4 -> DL4 -> DL5
		const a4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account4Id = a4.CreateAccountResponse.account[0].id;

		const dl4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist4@${domainName}</name>
				<a n="description">A test distribution list4</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list4Id = dl4Res.CreateDistributionListResponse.dl[0].id;
		list4Name = dl4Res.CreateDistributionListResponse.dl[0].name;

		const dl5Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist5@${domainName}</name>
				<a n="description">A test distribution list5</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list5Id = dl5Res.CreateDistributionListResponse.dl[0].id;
		list5Name = dl5Res.CreateDistributionListResponse.dl[0].name;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list4Id}</id>
				<dlm>${account4}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list5Id}</id>
				<dlm>${list4Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Setup 3: account5 -> DL6 -> DL7 -> DL8
		const a5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account5Id = a5.CreateAccountResponse.account[0].id;

		const dl6Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist6@${domainName}</name>
				<a n="description">A test distribution list6</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list6Id = dl6Res.CreateDistributionListResponse.dl[0].id;
		list6Name = dl6Res.CreateDistributionListResponse.dl[0].name;

		const dl7Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist7@${domainName}</name>
				<a n="description">A test distribution list7</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list7Id = dl7Res.CreateDistributionListResponse.dl[0].id;
		list7Name = dl7Res.CreateDistributionListResponse.dl[0].name;

		const dl8Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>dislist8@${domainName}</name>
				<a n="description">A test distribution list8</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		list8Id = dl8Res.CreateDistributionListResponse.dl[0].id;
		list8Name = dl8Res.CreateDistributionListResponse.dl[0].name;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list6Id}</id>
				<dlm>${account5}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list7Id}</id>
				<dlm>${list6Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${list8Id}</id>
				<dlm>${list7Name}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is member of one DL', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account2Id}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const found = dls.find(dl => dl.name === list1Name);
		assert.exists(found, `Account should be a member of ${list1Name}`);
	});


	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is not a member of any DLs', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account3Id}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');
	});


	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is member of one DL 1', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account2}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const found = dls.find(dl => dl.name === list1Name);
		assert.exists(found, `Account should be a member of ${list1Name}`);
	});


	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is not a member of any DLs 1', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account3}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');
	});


	it('Regression | Verifying the GetAccountMembershipRequest by id with blank, space, spchar, sometext, zero, negative', async () => {
		const invalidValues = ['', '          ', '!@^*()_#%%+', 'thissometexttogetaccountmembershipinvalid', '0000000000000000000000000', '-20238858'];
		for (const val of invalidValues) {
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
					<account by="id">${val}</account>
				</GetAccountMembershipRequest>`, adminAuthToken
			);
			assert.exists(response.Fault, `Should fault for id="${val}"`);

			const code = response.Fault.Detail.Error.Code;
			const allowedCodes = ['account.NO_SUCH_ACCOUNT', 'service.INVALID_REQUEST', 'service.PARSE_ERROR'];
			assert.isTrue(allowedCodes.some(c => code.includes(c)),
				`Should be an expected error for id="${val}", got: ${code}`);
		}
	});


	it('Regression | Verifying the GetAccountMembershipRequest by name with blank, space, spchar, sometext, zero, negative', async () => {
		const invalidValues = ['', '          ', '!@^*()_#%%+', 'thissometexttogetaccountmembershipinvalid', '0000000000000000000000000', '-20238858'];
		for (const val of invalidValues) {
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
					<account by="name">${val}</account>
				</GetAccountMembershipRequest>`, adminAuthToken
			);
			assert.exists(response.Fault, `Should fault for name="${val}"`);

			const code = response.Fault.Detail.Error.Code;
			const allowedCodes = ['account.NO_SUCH_ACCOUNT', 'service.INVALID_REQUEST', 'service.PARSE_ERROR'];
			assert.isTrue(allowedCodes.some(c => code.includes(c)),
				`Should be an expected error for name="${val}", got: ${code}`);
		}
	});


	it('Regression | Verifying the via-dl-name by name, where account is member of DL4 and DL4 is member of DL5', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account4}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const dl4 = dls.find(dl => dl.name === list4Name);
		assert.exists(dl4, `Should be member of ${list4Name}`);
		assert.isTrue(!dl4.via || dl4.via === '',
			'DL4 should be a direct membership (no via)');

		const dl5 = dls.find(dl => dl.name === list5Name);
		assert.exists(dl5, `Should be member of ${list5Name}`);
		assert.equal(dl5.via, list4Name, `DL5 via should be ${list4Name}`);
	});


	it('Regression | Verifying the via-dl-name by id, where account is member of DL4 and DL4 is member of DL5', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account4Id}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const dl4 = dls.find(dl => dl.name === list4Name);
		assert.exists(dl4, `Should be member of ${list4Name}`);

		const dl5 = dls.find(dl => dl.name === list5Name);
		assert.exists(dl5, `Should be member of ${list5Name}`);
		assert.equal(dl5.via, list4Name, `DL5 via should be ${list4Name}`);
	});


	it('Regression | Create a COS with valid name and zimbraPasswordMinAge is greater than zimbraPasswordMaxAge and negative values of zimbraPasswordMinAge and zimbraPasswordMaxAge', async () => {
		// By ID
		const resByid = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="id">${account5Id}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(resByid.Fault, 'Response should not be a Fault');
		assert.exists(resByid.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		let dls = resByid.GetAccountMembershipResponse.dl || [];
		const dl6ById = dls.find(dl => dl.name === list6Name);
		assert.exists(dl6ById, `Should be member of ${list6Name}`);

		const dl7ById = dls.find(dl => dl.name === list7Name);
		assert.exists(dl7ById, `Should be member of ${list7Name}`);
		assert.equal(dl7ById.via, list6Name);

		const dl8ById = dls.find(dl => dl.name === list8Name);
		assert.exists(dl8ById, `Should be member of ${list8Name}`);
		assert.equal(dl8ById.via, list7Name);

		// By Name
		const resByName = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account5}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		assert.notExists(resByName.Fault, 'Response should not be a Fault');
		assert.exists(resByName.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		dls = resByName.GetAccountMembershipResponse.dl || [];
		const dl6ByName = dls.find(dl => dl.name === list6Name);
		assert.exists(dl6ByName, `Should be member of ${list6Name}`);

		const dl7ByName = dls.find(dl => dl.name === list7Name);
		assert.exists(dl7ByName, `Should be member of ${list7Name}`);
		assert.equal(dl7ByName.via, list6Name);

		const dl8ByName = dls.find(dl => dl.name === list8Name);
		assert.exists(dl8ByName, `Should be member of ${list8Name}`);
		assert.equal(dl8ByName.via, list7Name);
	});
});
