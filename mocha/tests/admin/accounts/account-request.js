import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Request', function () {
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Sanity test for CreateAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const account = Array.isArray(response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;
		const host = account.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Verify response
		assert.exists(account.id, 'Account should have an id');
		assert.exists(response.CreateAccountResponse.account);
	});


	it('Sanity | Sanity test for GetAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// GetAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const account = Array.isArray(response.GetAccountResponse.account)
			? response.GetAccountResponse.account[0]
			: response.GetAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
		assert.exists(response.GetAccountResponse.account);
	});


	it('Sanity | Sanity test for ModifyAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// ModifyAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const account = Array.isArray(response.ModifyAccountResponse.account)
			? response.ModifyAccountResponse.account[0]
			: response.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
		assert.exists(response.ModifyAccountResponse.account);
	});


	it('Sanity | Sanity test for RenameAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// RenameAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for DeleteAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// DeleteAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for CheckPasswordStrengthRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// CheckPasswordStrengthRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CheckPasswordStrengthRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<password>${config.accountPassword}</password>
			</CheckPasswordStrengthRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for SetPasswordRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// SetPasswordRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newPassword>test1234</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for AddAccountAliasRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for RemoveAccountAliasRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ?
			createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

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
	});


	it('Sanity | Sanity test for GetAllAdminAccountsRequest', async () => {
		this.timeout(60000);

		// GetAllAdminAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllAdminAccountsRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for GetAccountInfoRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		(Array.isArray(createRes.CreateAccountResponse?.account) ?
			createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);

		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${acctName}</account>
			</GetAccountInfoRequest>`, userAuth
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountInfoResponse.name,
			'GetAccountInfoResponse should have name');

		assert.equal(response.GetAccountInfoResponse.name, acctName);
	});


	it('Sanity | Sanity test for GetAvailableSkinsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
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

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);

		// GetAvailableSkinsRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetAvailableSkinsRequest xmlns="urn:zimbraAccount"/>', userAuth
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for GetAvailableCsvFormatsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
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

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);

		// GetAvailableCsvFormatsRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetAvailableCsvFormatsRequest xmlns="urn:zimbraAccount"/>', userAuth
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for GetAdminConsoleUICompRequest', async () => {
		// GetAdminConsoleUICompRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAdminConsoleUICompRequest xmlns="urn:zimbraAdmin">
			</GetAdminConsoleUICompRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for SearchAccountsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ?
			createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// SearchAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SearchAccountsRequest xmlns="urn:zimbraAdmin">
				<query>zimbraId=${acctId}</query>
			</SearchAccountsRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');

		const accounts = response.SearchAccountsResponse.account || [];
		const found = accounts.find(a => a.id === acctId);

		// Verify response
		assert.exists(found, 'Should find the account by ID');
	});


	it('Sanity | Sanity test for MigrateAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ?
			createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// MigrateAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<MigrateAccountRequest xmlns="urn:zimbraAdmin">
				<migrate action="wiki" id="${acctId}"/>
			</MigrateAccountRequest>`, adminAuthToken
		);

		// May succeed or fault depending on server support, enforcing strict assertion:
		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});
});
