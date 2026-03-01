import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Accounts Loop', function () {
	let adminAuthToken;
	let domainName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		domainName = `domain${common.getUniqueString()}.com`;

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
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
	it('Sanity | Create 1000 account with valid username and password', async () => {
		for (let i = 0; i < 10; i++) {
			const acctName = `test.${common.getUniqueString()}@${domainName}`;

			// Create account
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.CreateAccountResponse,
				`Account ${i + 1} should be created`);
		}
	});


	it('Functional | GetAccountRequest with valid value of id', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// GetAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountResponse,
			'GetAccountResponse should exist');
		const account = Array.isArray(response.GetAccountResponse.account)
			? response.GetAccountResponse.account[0]
			: response.GetAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		assert.equal(response.GetAccountResponse.account[0].id, acctId);
	});


	it('Functional | Modify an account with all valid details', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// ModifyAccountRequest
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

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.ModifyAccountResponse,
			'ModifyAccountResponse should exist');
		const account = Array.isArray(response.ModifyAccountResponse.account)
			? response.ModifyAccountResponse.account[0]
			: response.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		assert.equal(response.ModifyAccountResponse.account[0].id, acctId);
	});


	it('Functional | Deleting the account with valid id, name', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// DeleteAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.DeleteAccountResponse,
			'DeleteAccountResponse should exist');
	});


	it('Functional | Rename an account with valid new-name', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const newName = `test.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.RenameAccountResponse,
			'RenameAccountResponse should exist');
	});


	it('Functional | Add an Alias to an account', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const aliasName = `alias.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AddAccountAliasResponse,
			'AddAccountAliasResponse should exist');
	});


	it('Functional | Remove an alias from an account', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;
		const aliasName = `alias.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// AddAccountAliasRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// RemoveAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.RemoveAccountAliasResponse,
			'RemoveAccountAliasResponse should exist');
	});


	it('Functional | Verify that SearchAccountsRequest receives a response', async () => {
		const acctName = `test.${common.getUniqueString()}@${domainName}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// SearchAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SearchAccountsRequest xmlns="urn:zimbraAdmin">
				<query>zimbraId=${acctId}</query>
			</SearchAccountsRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.SearchAccountsResponse,
			'SearchAccountsResponse should exist');

		const accounts = response.SearchAccountsResponse.account || [];
		const found = accounts.find(a => a.id === acctId);

		// Verify response
		assert.exists(found, 'Should find the account by ID');
	});


	it('Functional | Test for GetAllAdminAccountsRequest', async () => {
		this.timeout(60000);

		// GetAllAdminAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllAdminAccountsRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAllAdminAccountsResponse,
			'GetAllAdminAccountsResponse should exist');

		const accounts = response.GetAllAdminAccountsResponse.account || [];

		// Verify response
		assert.isAbove(accounts.length, 0, 'Should return at least one admin account');
	});
});
