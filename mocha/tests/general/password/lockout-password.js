import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > Password > Lockout Password', function () {
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
	it('Sanity | Verify account status changes to lockout after too many failed logins', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">90s</a>
				<a n="zimbraPasswordLockoutDuration">90s</a>
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
		await new Promise(resolve => setTimeout(resolve, 60000));

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
		const attrs = Array.isArray(getRes.GetAccountResponse.account[0].a)
			? getRes.GetAccountResponse.account[0].a
			: getRes.GetAccountResponse.account.a;
		const statusAttr = attrs.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content, 'lockout', 'Account status should be lockout');
	});


	it('Sanity | Verify lockout disabled account does not lock out', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">FALSE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

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
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login with valid password');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
	});


	it('Sanity | Verify success resets failure count (4 fails, 1 success, 4 fails - no lockout with max 5)', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">5</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		for (let i = 0; i < 4; i++) {

			// Auth request
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`
			);
		}

		// Send the message
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(successRes.Fault, 'Should login after 4 failed attempts');
		for (let i = 0; i < 4; i++) {

			// Auth request
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`
			);
		}

		// Send the message
		const finalRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(finalRes.Fault, 'Should login - count was reset');
	});


	it('Sanity | Verify admin can unlock a locked out account', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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

		// Modify the account
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyAccountRequest should not fault');

		// AuthRequest
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login after admin unlock');
	});


	it('Sanity | Verify maxFailures 0 means unlimited failures', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">0</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		for (let i = 0; i < 10; i++) {

			// Auth request
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`, ''
			);
		}

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login - maxFailures 0 means no lockout');
	});


	it('Sanity | Verify other lockout attributes on the account', async () => {
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

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const attrs = Array.isArray(getRes.GetAccountResponse.account[0].a)
			? getRes.GetAccountResponse.account[0].a
			: getRes.GetAccountResponse.account.a;
		const statusAttr = attrs.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content, 'lockout', 'Status should be lockout');
		const lockedTime = attrs.find(a => a.n === 'zimbraPasswordLockoutLockedTime');

		// Verify response
		assert.exists(lockedTime, 'zimbraPasswordLockoutLockedTime should exist');
		const failureTime = attrs.find(a => a.n === 'zimbraPasswordLockoutFailureTime');

		// Verify response
		assert.exists(failureTime, 'zimbraPasswordLockoutFailureTime should exist');
	});


	it('Sanity | Verify mail client AuthRequest returns AUTHFAILED when account is locked out', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

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
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.exists(authRes.Fault, 'Should fail - account is locked out');
	});


	it('Sanity | Verify mail client AuthRequest succeeds after the lockout expires', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">5s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

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
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login after lockout expires');
	});


	it('Sanity | Verify failureLifetime expires authentication failures', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">5s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// AuthRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>betelgeuse</password>
			</AuthRequest>`, ''
		);

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Should login - failure lifetime expired');
	});


	it('Sanity | Verify failed auths are tracked in zimbraPasswordLockoutFailureTime 1', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">5</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		for (let i = 0; i < 4; i++) {

			// Auth request
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`
			);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const attrs = Array.isArray(getRes.GetAccountResponse.account[0].a)
			? getRes.GetAccountResponse.account[0].a
			: getRes.GetAccountResponse.account.a;
		const failureTimes = attrs.filter(a => a.n === 'zimbraPasswordLockoutFailureTime');

		// Verify response
		assert.isAtLeast(failureTimes.length, 4,
			'Should have at least 4 failure times tracked');
	});


	it('Sanity | Verify failed auths are tracked in zimbraPasswordLockoutFailureTime 2', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">5</a>
				<a n="zimbraPasswordLockoutFailureLifetime">5s</a>
				<a n="zimbraPasswordLockoutDuration">60s</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;
		for (let i = 0; i < 4; i++) {

			// Auth request
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`, ''
			);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		await new Promise(resolve => setTimeout(resolve, 10000));
		for (let i = 0; i < 2; i++) {

			// Send the message
			await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${accountEmail}</account>
					<password>betelgeuse</password>
				</AuthRequest>`, ''
			);
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Get account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		const attrs = Array.isArray(getRes.GetAccountResponse.account[0].a)
			? getRes.GetAccountResponse.account[0].a
			: getRes.GetAccountResponse.account.a;
		const failureTimes = attrs.filter(a => a.n === 'zimbraPasswordLockoutFailureTime');

		// Verify response
		assert.equal(failureTimes.length, 2,
			'Should have 2 failure times after expiry');
	});


	it('Sanity | Verify locked out account can still receive messages', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const senderEmail = `sender${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutMaxFailures">2</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutDuration">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

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

		// Authenticate account
		const senderAuthToken = await soap.getAccountAuthToken(senderEmail);
		const subject = `Test${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content for locked account</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should succeed to locked account');
		assert.exists(sendRes.SendMsgResponse, 'Message should be sent');
	});
});
