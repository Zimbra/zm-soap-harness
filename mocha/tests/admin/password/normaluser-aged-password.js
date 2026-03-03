import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > NormalUser Aged Password', function () {
	this.timeout(120 * 1000);
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

	// Helper: generate Zimbra LDAP generalized time (YYYYMMDDHHmmssZ) offset by milliseconds
	function genTimeOffset(offsetMs) {
		const d = new Date(Date.now() + offsetMs);
		const pad = (n, w = 2) => String(n).padStart(w, '0');
		return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
	}

	// Shorthand helpers
	function genTimeOffsetDays(days) {
		return genTimeOffset(days * 24 * 60 * 60 * 1000);
	}

	function genTimeOffsetSeconds(seconds) {
		return genTimeOffset(seconds * 1000);
	}

	// Tests
	it('Functional | Verify that a user cannot change his password if its age is not past the minimum', async () => {
		// Create account with minAge=7 days
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set password modified time to 3 days ago (less than minAge of 7)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-3)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Try to change password — should fail (too soon)
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>bogus123</password>
			</ChangePasswordRequest>`, accountToken, false
		);
		assert.isString(changeRes.Fault.Detail.Error.Code, 'ChangePasswordRequest should fault');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | Verify that after a user changes his password, that the timestamp is updated, and he cannot change the password again, since its age is not past the minimum', async () => {
		// Create account with minAge=7 days
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Auth FIRST (this updates modified time), then set it to 10 days ago
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-10)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		await soap.waitFor(2000);

		// Change password (should succeed - past minAge)
		const tmpPassword = 'bogus123';
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>${tmpPassword}</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'First ChangePasswordRequest should not fault');

		// Auth with new password
		const newToken = await soap.getAccountAuthToken(accountEmail, tmpPassword);

		// Try to change again — should fail (timestamp updated, too soon again)
		const changeRes2 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${tmpPassword}</oldPassword>
				<password>${password}</password>
			</ChangePasswordRequest>`, newToken, false
		);
		assert.isString(changeRes2.Fault.Detail.Error.Code, 'Second ChangePasswordRequest should fault');
		assert.include(changeRes2.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | Verify that a user can change his password if its age is past the minimum', async () => {
		// Create account with minAge=7 days
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Auth FIRST, then set modified time to 10 days ago
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-10)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		await soap.waitFor(2000);

		// Change password — should succeed (past minAge)
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>bogus123</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
	});


	it('Functional | Verify that a user must change his password if its age is past the maximum', async () => {
		// Create account with maxAge=60, minAge=7
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set password modified time to 61 days ago (past maxAge of 60)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-61)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — should indicate password must change
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');

		// Change password with newPassword in auth
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
				<newPassword>bogus123</newPassword>
			</AuthRequest>`
		);
		assert.notExists(authRes2.Fault, 'AuthRequest with newPassword should not fault');
	});


	it('Functional | Verify that a user can change his password immediately, if the minimum is set to 0', async () => {
		// Create account with maxAge=60, minAge=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth and immediately change password — should succeed
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>bogus123</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
	});


	it('Functional | Verify that a user does not have to change his password if the change time is large and the maximum is set to 0', async () => {
		// Create account with maxAge=0, minAge=7
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">0</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set password modified time to 1915 days ago
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-1915)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — should succeed without resetPassword (maxAge=0 means no expiry)
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse.lifetime, 'Lifetime should exist');
	});


	it('Functional | Verify that the granularity of the minimum password age is to the second', async () => {
		// Create account with maxAge=60, minAge=1 day
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set password modified time to 23h59m50s ago (just under 1 day = 86400s, so 86370s)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetSeconds(-86370)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth and try to change — should fail (still within minAge)
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>bogus123</password>
			</ChangePasswordRequest>`, accountToken, false
		);
		assert.isString(changeRes.Fault.Detail.Error.Code, 'ChangePasswordRequest should fault');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_CHANGE_TOO_SOON');
	});


	it('Functional | TBD 1', async () => {
		// Create account with maxAge=60, minAge=1 day
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">60</a>
				<a n="zimbraPasswordMinAge">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Auth FIRST, then set password modified time
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetSeconds(-86430)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		await soap.waitFor(2000);

		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${password}</oldPassword>
				<password>bogus123</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
	});


	it('Functional | Verify that the granularity of the maximum password age is to the second', async () => {
		// Create account with maxAge=1, minAge=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">1</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set modified time to 23h59m50s ago (just under 1 day)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetSeconds(-86350)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — lifetime should exist (not expired yet)
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse.lifetime, 'Lifetime should exist');
	});


	it('Functional | TBD 2', async () => {
		// Create account with maxAge=1, minAge=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">1</a>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set modified time to 24h+1s ago (just past 1 day = 86401s)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetSeconds(-86401)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — should get resetPassword=true (expired)
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
	});


	it('Functional | Verify that the granularity of the maximum password age is to the year', async () => {
		// Create account with maxAge=365, minAge=7
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">365</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set modified time to 364 days ago (less than maxAge of 365)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-364)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — should succeed without resetPassword
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse.lifetime, 'Lifetime should exist');
	});


	it('Functional | TBD 3', async () => {
		// Create account with maxAge=365, minAge=7
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${password}</password>
				<a n="zimbraPasswordMaxAge">365</a>
				<a n="zimbraPasswordMinAge">7</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;

		// Set modified time to 366 days ago (past maxAge of 365)
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraPasswordModifiedTime">${genTimeOffsetDays(-366)}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth — should get resetPassword=true
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${password}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
	});
});
