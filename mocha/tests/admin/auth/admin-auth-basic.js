import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Auth > Admin Auth Basic', function () {
	this.timeout(60 * 1000);
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
	it('Sanity | Login to the Admin using complete name and valid password', async () => {
		// Auth as admin with full email
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);

		// Verify auth token is returned
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Login to the Admin using only name and valid password', async () => {
		// Auth as admin with full email
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);

		// Verify auth token is returned
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Login to the Admin having accented password', async () => {
		// Create a new admin account with accented characters in the password
		const accentedPassword = 'tëstîñg';
		const accountEmail = `accented.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${accentedPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Authenticate as the new admin user with accented password
		const authRes = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${accentedPassword}</password>
			</AuthRequest>`, null
		);

		// Verify auth token is returned
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Verify admin AuthRequest support account by syntax Check for name, id, foriegn principal', async () => {
		// Create admin account with foreign principal
		const accountEmail = `admin.${common.getUniqueString()}@${config.testDomain}`;
		const foreignPrincipal = `test:${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.adminPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
				<a n="zimbraForeignPrincipal">${foreignPrincipal}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = account.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const adminId = account.id;

		// Auth by foreignPrincipal
		await common.delay(2000);
		const authByFp = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authByFp.Fault, 'Auth by foreignPrincipal should not fault');
		assert.exists(authByFp.AuthResponse.authToken, 'authToken should exist');

		// Auth by id
		await common.delay(2000);
		const authById = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${adminId}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authById.Fault, 'Auth by id should not fault');
		assert.exists(authById.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify admin AuthRequest support account by syntax and without default domain name', async () => {
		// Create admin account on default domain (auth without @domain only works on default domain)
		const accountName = `admin.${common.getUniqueString()}`;
		const accountEmail = `${accountName}@${config.serverDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.adminPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth without domain name (just username)
		const authRes = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${accountName}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Auth without domain should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Create delegated admin account
		const delegatedName = `admin.${common.getUniqueString()}`;
		const delegatedEmail = `${delegatedName}@${config.serverDomain}`;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${delegatedEmail}</name>
				<password>${config.adminPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'CreateAccountRequest should not fault');

		// Auth without domain name for delegated admin
		const authRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${delegatedName}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes2.Fault, 'Auth delegated admin without domain should not fault');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Check the case when neither name or account is specified and throw serviceAUTHREQUIRED for that', async () => {
		// Auth without name or account element
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Smoke | Admin auth without password', async () => {
		// Auth without password element
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
			</AuthRequest>`, null, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.AUTH_REQUIRED');
	});
});
