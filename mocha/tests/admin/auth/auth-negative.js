import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Auth > Auth Negative', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let adminUserEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test admin account
		adminUserEmail = `admin${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${adminUserEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Admin account creation should not fault');
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
	it('Functional | Make sure valid admin login succeeds', async () => {
		// Auth via account endpoint with valid credentials
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify auth response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.match(String(res.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Login with a domain with a left parenthes 1', async () => {
		// Auth with domain containing parenthesis
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@inva(lid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with less than', async () => {
		// Auth with domain containing less-than character
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@inva&lt;lid_domain,com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with a left parenthes 2', async () => {
		// Auth with domain containing left parenthesis
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@zim(bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with a right parenthes', async () => {
		// Auth with domain containing right parenthesis
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@zimb)ra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with a vertical bar', async () => {
		// Auth with domain containing pipe character
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@zim|bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with an ampersand', async () => {
		// Auth with domain containing ampersand
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@zimb&amp;ra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with a semicolon', async () => {
		// Auth with domain containing semicolon
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@z;imbra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with a equals sign', async () => {
		// Auth with domain containing equals sign
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@zim=bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a domain with two at at signs', async () => {
		// Auth with domain containing two @ signs
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">user1@user1@example.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Functional | Login with a password with a left parenthes', async () => {
		// Auth with password containing left parenthesis
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>tes(t123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a password with a right parenthes', async () => {
		// Auth with password containing right parenthesis
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>tes)t123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a password with a vertical bar', async () => {
		// Auth with password containing pipe character
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>test|123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a password with a ampersand', async () => {
		// Auth with password containing ampersand
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>test&amp;123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a password with a semi-colon', async () => {
		// Auth with password containing semicolon
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>tes;t123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Login with a password with a equals sign', async () => {
		// Auth with password containing equals sign
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${adminUserEmail}</account>
				<password>test=123</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});
});
