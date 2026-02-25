import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Request', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Sanity test for CreateAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(response.CreateAccountResponse);
		assert.exists(response.CreateAccountResponse.account);
	});


	it('Sanity | Sanity test for GetAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(response.GetAccountResponse);
		assert.exists(response.GetAccountResponse.account);
	});


	it('Sanity | Sanity test for ModifyAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(response.ModifyAccountResponse);
		assert.exists(response.ModifyAccountResponse.account);
	});


	it('Sanity | Sanity test for RenameAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);
		assert.exists(response.RenameAccountResponse);
	});


	it('Sanity | Sanity test for DeleteAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.exists(response.DeleteAccountResponse);
	});


	it('Sanity | Sanity test for CheckPasswordStrengthRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CheckPasswordStrengthRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<password>${config.accountPassword}</password>
			</CheckPasswordStrengthRequest>`, adminAuthToken
		);
		assert.exists(response.CheckPasswordStrengthResponse);
	});


	it('Sanity | Sanity test for SetPasswordRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newPassword>test1234</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.exists(response.SetPasswordResponse);
	});


	it('Sanity | Sanity test for AddAccountAliasRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.AddAccountAliasResponse);
	});


	it('Sanity | Sanity test for RemoveAccountAliasRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

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


	it('Sanity | Sanity test for GetAllAdminAccountsRequest', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllAdminAccountsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.exists(response.GetAllAdminAccountsResponse);
	});


	it('Sanity | Sanity test for GetAccountInfoRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${acctName}</account>
			</GetAccountInfoRequest>`, userAuth
		);
		assert.exists(response.GetAccountInfoResponse);
		assert.equal(response.GetAccountInfoResponse.name, acctName);
	});


	it('Sanity | Sanity test for GetAvailableSkinsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAvailableSkinsRequest xmlns="urn:zimbraAccount"/>`, userAuth
		);
		assert.exists(response.GetAvailableSkinsResponse);
	});


	it('Sanity | Sanity test for GetAvailableCsvFormatsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const userAuth = await soap.getAccountAuthToken(acctName, config.accountPassword);
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAvailableCsvFormatsRequest xmlns="urn:zimbraAccount"/>`, userAuth
		);
		assert.exists(response.GetAvailableCsvFormatsResponse);
	});


	it('Sanity | Sanity test for GetAdminConsoleUICompRequest', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAdminConsoleUICompRequest xmlns="urn:zimbraAdmin">
			</GetAdminConsoleUICompRequest>`, adminAuthToken
		);
		assert.exists(response.GetAdminConsoleUICompResponse);
	});


	it('Sanity | Sanity test for SearchAccountsRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

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


	it('Sanity | Sanity test for MigrateAccountRequest', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<MigrateAccountRequest xmlns="urn:zimbraAdmin">
				<migrate action="wiki" id="${acctId}"/>
			</MigrateAccountRequest>`, adminAuthToken
		);
		// May succeed or fault depending on server support, enforcing strict assertion:
		assert.exists(response.MigrateAccountResponse);
	});
});
