import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Password > Bugs > ZCS 126', function () {
	this.timeout(300 * 1000);
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
	it('Sanity | Verify that zimbraPasswordLockoutFailureTime is not updated once the account is locked', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// AuthRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);

		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Get account
		const getRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes1.Fault, 'GetAccountRequest should not fault');
		const acctData1 = Array.isArray(getRes1.GetAccountResponse.account)
			? getRes1.GetAccountResponse.account[0]
			: getRes1.GetAccountResponse.account;
		const attrs1 = acctData1.a;
		const statusAttr1 = attrs1.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr1._content, 'lockout', 'Account status should be lockout');
		const failureTimeAttr1 = attrs1.find(a => a.n === 'zimbraPasswordLockoutFailureTime');
		const lockoutFailureTime = failureTimeAttr1._content;

		// AuthRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Get account
		const getRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes2.Fault, 'GetAccountRequest should not fault');
		const acctData2 = Array.isArray(getRes2.GetAccountResponse.account)
			? getRes2.GetAccountResponse.account[0]
			: getRes2.GetAccountResponse.account;
		const attrs2 = acctData2.a;
		const statusAttr2 = attrs2.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr2._content, 'lockout', 'Account should still be locked out');
		const failureTimeAttr2 = attrs2.find(a => a.n === 'zimbraPasswordLockoutFailureTime');

		// Verify response
		assert.equal(failureTimeAttr2._content, lockoutFailureTime,
			'LockoutFailureTime should not change after account is already locked');
	});


	it('Sanity | Verify lockout attributes on the account are cleaned after account is unlocked', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// AuthRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);

		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);

		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);
		await new Promise(resolve => setTimeout(resolve, 90000));

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login after lockout expires');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
		const acctData = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;
		const attrs = acctData.a;
		const statusAttr = attrs.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content, 'active', 'Account status should be active');
		const failureTimeAttr = attrs.find(a => a.n === 'zimbraPasswordLockoutFailureTime');

		// Verify response
		assert.isUndefined(failureTimeAttr,
			'zimbraPasswordLockoutFailureTime should be empty after unlock');
	});
});
