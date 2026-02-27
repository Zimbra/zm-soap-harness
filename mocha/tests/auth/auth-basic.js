import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Basic', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 with foreign principal
		account1Name = 'user' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');

		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		account1Id = acct.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Basic Test - AuthRequest - login to the client using by name', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Smoke | Basic Test - AuthRequest - login to the client using by id', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="id">${account1Id}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify User auth token should not be able to execute RunUnitTestRequest', async () => {
		// Get user auth token
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const userToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content
			: authRes.AuthResponse.authToken._content
			|| authRes.AuthResponse.authToken;

		// Try RunUnitTestsRequest with user token
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RunUnitTestsRequest xmlns="urn:zimbraAdmin">
			</RunUnitTestsRequest>`, userToken
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Sanity | Verify account AuthRequest support account by syntax and without default domain name', async () => {
		const acctNameOnly = 'user3.' + common.getUniqueString();

		// Get the server's default domain name
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraDefaultDomainName" />
			</GetConfigRequest>`, adminAuthToken
		);
		const configAttrs = configRes.GetConfigResponse.a;
		const defaultDomainAttr = Array.isArray(configAttrs)
			? configAttrs.find(a => a.n === 'zimbraDefaultDomainName')
			: configAttrs;
		const defaultDomain = defaultDomainAttr ? defaultDomainAttr._content : config.testDomain;
		const acctFullName = acctNameOnly + '@' + defaultDomain;

		// Create account on default domain
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctFullName}</name>
				<password>${config.adminPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse,
			'CreateAccountResponse should exist');

		// Auth by name without domain
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${acctNameOnly}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Basic Test - AuthRequest - login to the client using by foreignPrincipal', async () => {
		const foreignPrincipal = 'test:' + common.getUniqueString();

		// Add foreign principal to account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraForeignPrincipal">${foreignPrincipal}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Auth by foreignPrincipal
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Verify that Accented characters in password field is allowed', async () => {
		const accentedPassword = 'tëstäöü';
		const account2Name = 'user2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account with accented password
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${accentedPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		// Auth with accented password
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="id">${acct.id}</account>
				<password>${accentedPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});
});
