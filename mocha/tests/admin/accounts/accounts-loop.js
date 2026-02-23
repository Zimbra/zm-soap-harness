import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Accounts Loop', function () {
	let adminAuthToken;
	let domainName;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		domainName = `domain${common.getUniqueString()}.com`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create 10 accounts in a loop', async () => {
		for (let i = 0; i < 10; i++) {
			const acctName = `test.${common.getUniqueString()}@${domainName}`;
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.exists(response.CreateAccountResponse,
				`Account ${i + 1} should be created`);
		}
	});


	it('Functional | GetAccountRequest with valid id', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(response.GetAccountResponse);
		assert.equal(response.GetAccountResponse.account[0].id, acctId);
	});


	it('Functional | Modify an account with all valid details', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraFeatureCalendarEnabled">TRUE</a>
				<a n="zimbraPop3Enabled">TRUE</a>
				<a n="zimbraImapEnabled">TRUE</a>
				<a n="zimbraContactMaxNumEntries">0</a>
				<a n="zimbraFeatureContactsEnabled">TRUE</a>
				<a n="zimbraPrefIncludeSpamInSearch">FALSE</a>
				<a n="zimbraPrefMailItemsPerPage">25</a>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(response.ModifyAccountResponse);
		assert.equal(response.ModifyAccountResponse.account[0].id, acctId);
	});


	it('Functional | Delete an account with valid id', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.exists(response.DeleteAccountResponse);
	});


	it('Functional | Rename an account with valid new-name', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const newName = `test.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(response.RenameAccountResponse);
	});


	it('Functional | Add an alias to an account', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const aliasName = `alias.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.AddAccountAliasResponse);
	});


	it('Functional | Remove an alias from an account', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const aliasName = `alias.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.RemoveAccountAliasResponse);
	});


	it('Functional | SearchAccountsRequest finds created account', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SearchAccountsRequest xmlns="urn:zimbraAdmin">
				<query>zimbraId=${acctId}</query>
			</SearchAccountsRequest>`, adminAuthToken
		);
		assert.exists(response.SearchAccountsResponse);

		const accounts = response.SearchAccountsResponse.account || [];
		const found = accounts.find(a => a.id === acctId);
		assert.exists(found, 'Should find the account by ID');
	});


	it('Functional | GetAllAdminAccountsRequest returns admin accounts', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllAdminAccountsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.exists(response.GetAllAdminAccountsResponse);

		const accounts = response.GetAllAdminAccountsResponse.account || [];
		assert.isAbove(accounts.length, 0, 'Should return at least one admin account');
	});

});
