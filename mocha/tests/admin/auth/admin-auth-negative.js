import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Auth > Admin Auth Negative', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let adminUserEmail;
	let nonadminUserEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create admin test account
		adminUserEmail = `admin${common.getUniqueString()}@${config.testDomain}`;
		const createAdmin = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAdmin.Fault, 'Admin account creation should not fault');
		assert.exists(createAdmin.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createAdmin.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Create non-admin test account
		nonadminUserEmail = `admin${common.getUniqueString()}@${config.testDomain}`;
		const createNonAdmin = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${nonadminUserEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createNonAdmin.Fault, 'Non-admin account creation should not fault');
		assert.exists(createNonAdmin.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host2 = createNonAdmin.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
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
	it('Sanity | Make sure valid admin login succeeds', async () => {
		// Auth as admin with valid credentials
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify auth response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.AuthResponse.lifetime, 'lifetime should exist');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Regression | Login with a wrong domain name', async () => {
		// Auth with wrong domain name containing less-than character
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@inva&lt;lid_domain,com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Regression | Login with a domain with special characters', async () => {
		// Login with a domain with underscore and parenthesis
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@inva(lid_domain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for parenthesis domain');
		assert.include(res1.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with a left parenthesis
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@te(stdomain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for left parenthesis');
		assert.include(res2.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with a right parenthesis
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@tes)tdomain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should return a Fault for right parenthesis');
		assert.include(res3.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with a pipe
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@te|stdomain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should return a Fault for pipe');
		assert.include(res4.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with an ampersand
		const res5 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@test&amp;domain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Should return a Fault for ampersand');
		assert.include(res5.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with a semicolon
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@t;domain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Should return a Fault for semicolon');
		assert.include(res6.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with a equals sign
		const res7 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@test=domain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res7.Fault.Detail.Error.Code, 'Should return a Fault for equals sign');
		assert.include(res7.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a domain with two @ signs
		const res8 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>user1@test@testdomain.com</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res8.Fault.Detail.Error.Code, 'Should return a Fault for double at signs');
		assert.include(res8.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Login with a blank user and valid password', async () => {
		// Auth with blank username
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>       </name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Regression | Login with a blank user and invalid password', async () => {
		// Auth with blank username and invalid password
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>       </name>
				<password>tes(t123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Regression | Login with a valid user and blank password', async () => {
		// Auth with valid username and blank password
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>      </password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Regression | Login with a blank user and blank password', async () => {
		// Auth with blank username and blank password
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>       </name>
				<password>      </password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Regression | Login with a password with special characters', async () => {
		// Login with a password with a left parenthesis
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>tes(t123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for left parenthesis');
		assert.include(res1.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a password with a right parenthesis
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>tes)t123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for right parenthesis');
		assert.include(res2.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a password with a pipe
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>test|123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should return a Fault for pipe');
		assert.include(res3.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a password with a ampersand
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>test&amp;123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should return a Fault for ampersand');
		assert.include(res4.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a password with a semi-colon
		const res5 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>tes;t123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Should return a Fault for semicolon');
		assert.include(res5.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// Login with a password with a equals sign
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>test=123</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Should return a Fault for equals sign');
		assert.include(res6.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Make sure nonadmin account can not login as an admin', async () => {
		// Auth as non-admin account on admin endpoint
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${nonadminUserEmail}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify permission denied
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});
});
