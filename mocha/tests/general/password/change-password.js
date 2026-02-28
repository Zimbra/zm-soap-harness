import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > Password > Change Password', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify change password returned for accounts with zimbraPasswordMustChange TRUE', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMustChange">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		const resetPassword = authRes.AuthResponse.resetPassword
			? (authRes.AuthResponse.resetPassword._content || authRes.AuthResponse.resetPassword._)
			: undefined;
		assert.equal(String(resetPassword), 'true', 'resetPassword should be true');
		const restrictedAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password using AuthRequest with newPassword
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
				<newPassword>${tmpPassword}</newPassword>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'AuthRequest with newPassword should not fault: ' + JSON.stringify(changeRes.Fault));
		assert.exists(changeRes.AuthResponse, 'AuthResponse should exist after password change');
	});


	it('Sanity | Verify normal response if zimbraPasswordMustChange is FALSE', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMustChange">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login normally');
		assert.exists(authRes.AuthResponse,
			'AuthResponse should exist');
	});


	it('Sanity | Verify that password can be changed when zimbraFeatureChangePasswordEnabled is TRUE', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureChangePasswordEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
		assert.exists(changeRes.ChangePasswordResponse,
			'ChangePasswordResponse should exist');
	});


	it('Sanity | Verify operation denied when zimbraFeatureChangePasswordEnabled is FALSE', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureChangePasswordEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(changeRes.Fault, 'Should return Fault for operation denied');
	});
});
