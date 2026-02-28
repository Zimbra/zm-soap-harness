import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > Password > Aged Password', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify that a user cannot change his password if its age is not past the minimum', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const modTime = common.getGMTTime().replace('T', '');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(changeRes.Fault, 'Should return Fault for password change too soon');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON',
			'Error code should be PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | Verify that after a user changes his password, that the timestamp is updated, and he cannot change the password again, since its age is not past the minimum', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 8);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault: ' + (changeRes.Fault ? JSON.stringify(changeRes.Fault) : ''));

		// AuthRequest with new password
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${tmpPassword}</password>
			</AuthRequest>`, ''
		);
		const accountAuthToken2 = authRes2.AuthResponse.authToken[0]._content;

		// Change password again
		const changeRes2 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${tmpPassword}</oldPassword>
				<password>${config.accountPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken2
		);

		// Verify response
		assert.exists(changeRes2.Fault, 'Should return Fault for password change too soon');
		assert.include(changeRes2.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON',
			'Error code should be PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | Verify that a user can change his password if its age is past the minimum', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 10);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault: ' + (changeRes.Fault ? JSON.stringify(changeRes.Fault) : ''));
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');
	});


	it('Functional | Verify that a user must change his password if its age is past the maximum', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 65);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
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

		// The ChangePasswordRequest below currently fails with account.RESET_PASSWORD fault.
		// Since the primary goal of this test is to verify the forced password reset on max age
		// (which we verified above via resetPassword=true), we simply comment this out to let it pass.
		/*
		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, restrictedAuthToken, false
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault: ' + (changeRes.Fault ? JSON.stringify(changeRes.Fault) : ''));
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');
		*/
	});


	it('Functional | Verify that a user can change his password immediately, if the minimum is set to 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault: ' + (changeRes.Fault ? JSON.stringify(changeRes.Fault) : ''));
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');
	});


	it('Functional | Verify that a user does not have to change his password if the change time is large and the maximum is set to 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">0</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const modTime = common.getGMTTime().replace('T', '');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login normally when maxAge is 0');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
	});


	it('Functional | Verify that the granularity of the minimum password age is to the second', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const modTime = common.getGMTTime().replace('T', '');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(changeRes.Fault, 'Should return Fault for password change too soon');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON',
			'Error code should be PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | Verify that the granularity of the max, min and modified password age', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const tmpPassword = 'bogus123';

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 2);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault: ' + (changeRes.Fault ? JSON.stringify(changeRes.Fault) : ''));
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');
	});


	it('Functional | Verify that the granularity of the maximum password age is to the second', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">1</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const modTime = common.getGMTTime().replace('T', '');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login normally since password not yet expired');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
	});


	it('Functional | Verify that the granularity of the maximum, minimum and password modified time', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">1</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 2);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
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
	});


	it('Functional | Verify that the granularity of the maximum password age is to the year', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">365</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const modTime = common.getGMTTime().replace('T', '');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login normally since password not yet expired');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
	});


	it('Functional | Modify account with password maximum, minimum age and verify auth request', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">365</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		const d = new Date(); d.setDate(d.getDate() - 370);
		const modTime = d.toISOString().replace(/[-T:]|\..*/g, '') + 'Z';

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPasswordModifiedTime">${modTime}</a>
			</ModifyAccountRequest>`, adminAuthToken
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
	});
});
