import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import server from '../../../framework/backend/server-command.js';
import { main } from '../../../pages/main.js';

describe('Auth > Virtualhost > Auth Virtualhost', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let testAccountUser;
	let testAccountServer;
	let defaultDomainName;
	let testDomainName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		testAccountUser = 'user' + common.getUniqueString();
		testDomainName = 'domain' + common.getUniqueString() + '.com';

		// Get default domain name
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraDefaultDomainName" />
			</GetConfigRequest>`, adminAuthToken
		);
		const configAttrs = configRes.GetConfigResponse.a;
		const defaultDomainAttr = Array.isArray(configAttrs)
			? configAttrs.find(a => a.n === 'zimbraDefaultDomainName')
			: configAttrs;
		defaultDomainName = defaultDomainAttr ? defaultDomainAttr._content : config.testDomain;

		// Create account on default domain
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountUser}@${defaultDomainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		testAccountServer = host1 ? host1._content : config.server;

		// Create test domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${testDomainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account on test domain with different password
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountUser}@${testDomainName}</name>
				<password>${config.accountPassword}v</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Tests
	if (config.serial !== true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Sanity | Virtual Host Test: AuthRequest - login as from virtual host, no virtual hosts defined Should use test_account1@defaultdomain/password to authenticate', async () => {
			const virtualHost = 'v' + common.getUniqueString() + '.virtual.com';

			// Send the message
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}</password>
					<virtualHost>${virtualHost}</virtualHost>
				</AuthRequest>`, null, true, testAccountServer
			);

			// Verify response
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		});


		it('Sanity | Virtual Host Test - AuthRequest - login with virtual host password', async () => {
			const virtualHost = 'v' + common.getUniqueString() + '.virtual.com';

			// Send the message
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}v</password>
					<virtualHost>${virtualHost}</virtualHost>
				</AuthRequest>`, null, true, testAccountServer
			);
			assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should fail with AUTH_FAILED');
		});


		it('Sanity | Virtual Host Test - AuthRequest - login with full account name', async () => {
			// Send the message
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${testDomainName}</account>
					<password>${config.accountPassword}v</password>
					<virtualHost>v${common.getUniqueString()}.virtual.com</virtualHost>
				</AuthRequest>`, null
			);

			// Verify response
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		});


		it('Sanity | Virtual Host Test - AuthRequest - login using default, good password', async () => {
			const virtualHost01 = 'v' + common.getUniqueString() + '.virtual.com';
			const domain1Name = 'domain' + common.getUniqueString() + '.com';

			adminAuthToken = await soap.getAdminAuthToken();

			// Create domain with virtual host
			const domainRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateDomainRequest xmlns="urn:zimbraAdmin">
					<name>${domain1Name}</name>
					<a n="zimbraVirtualHostname">${virtualHost01}</a>
				</CreateDomainRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(domainRes.Fault, 'Response should not be a Fault');

			const domainId = Array.isArray(domainRes.CreateDomainResponse.domain)
				? domainRes.CreateDomainResponse.domain[0].id
				: domainRes.CreateDomainResponse.domain.id;

			// Create account
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${testAccountUser}@${domain1Name}</name>
					<password>${config.accountPassword}${domain1Name}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(createRes.Fault, 'Response should not be a Fault');

			const acct = Array.isArray(createRes.CreateAccountResponse.account)
				? createRes.CreateAccountResponse.account[0]
				: createRes.CreateAccountResponse.account;
			const host = acct.a.find(a => a.n === 'zimbraMailHost');
			const acctServer = host ? host._content : config.server;

			// Auth using virtual host
			// Send the message
			const authRes = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}${domain1Name}</password>
					<virtualHost>${virtualHost01}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);

			// Verify response
			assert.notExists(authRes.Fault, 'Response should not be a Fault');
			assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

			const authToken = Array.isArray(authRes.AuthResponse.authToken)
				? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
				: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

			// Verify account info
			const infoRes = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain1Name}</account>
				</GetAccountInfoRequest>`, authToken, false, acctServer
			);

			// Verify response
			assert.notExists(infoRes.Fault, 'Response should not be a Fault');

			// Cleanup virtual host
			await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domainId}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);
		});


		it('Sanity | Basic Test - AuthRequest - login using default, good password - multiple virtual hosts', async () => {
			const virtualHost01 = 'v1' + common.getUniqueString() + '.virtual.com';
			const virtualHost02 = 'v2' + common.getUniqueString() + '.virtual.com';
			const virtualHost03 = 'v3' + common.getUniqueString() + '.virtual.com';
			const domain3Name = 'domain' + common.getUniqueString() + '.com';
			const passwordNew = 'test123newtest';

			adminAuthToken = await soap.getAdminAuthToken();

			// Create domain
			const domRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateDomainRequest xmlns="urn:zimbraAdmin">
					<name>${domain3Name}</name>
				</CreateDomainRequest>`, adminAuthToken
			);
			const domain3Id = Array.isArray(domRes.CreateDomainResponse.domain)
				? domRes.CreateDomainResponse.domain[0].id
				: domRes.CreateDomainResponse.domain.id;

			// Create account
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${testAccountUser}@${domain3Name}</name>
					<password>${passwordNew}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(createRes.CreateAccountResponse.account)
				? createRes.CreateAccountResponse.account[0]
				: createRes.CreateAccountResponse.account;
			const host = acct.a.find(a => a.n === 'zimbraMailHost');
			const acctServer = host ? host._content : config.server;

			// Add multiple virtual hosts
			const modRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain3Id}</id>
					<a n="zimbraVirtualHostname">${virtualHost01}</a>
					<a n="zimbraVirtualHostname">${virtualHost02}</a>
					<a n="zimbraVirtualHostname">${virtualHost03}</a>
				</ModifyDomainRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modRes.Fault, 'Response should not be a Fault');
			const domain = Array.isArray(modRes.ModifyDomainResponse.domain)
				? modRes.ModifyDomainResponse.domain[0]
				: modRes.ModifyDomainResponse.domain;

			// Verify response
			assert.exists(domain.id, 'domain id should exist');

			// Auth with virtual host 01
			// Send the message
			const authRes1 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost01}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);

			// Verify response
			assert.notExists(authRes1.Fault, 'Response should not be a Fault');
			assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

			// Auth with virtual host 02
			// Send the message
			const authRes2 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);

			// Verify response
			assert.notExists(authRes2.Fault, 'Response should not be a Fault');
			assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

			// Auth with virtual host 03
			// Send the message
			const authRes3 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost03}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);

			// Verify response
			assert.notExists(authRes3.Fault, 'Response should not be a Fault');
			assert.match(String(authRes3.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes3.AuthResponse.authToken, 'authToken should exist');

			// Cleanup
			await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain3Id}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);
		});
	}


	// Serial tests
	if (config.serial === true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Serial | Basic Test - AuthRequest - login using default, good password - Adding and removing virtual host', async () => {
			this.timeout(600 * 1000);

			const virtualHost02 = 'v' + common.getUniqueString() + '.virtual.com';
			const virtualHost03 = 'v' + common.getUniqueString() + '.virtual.com';
			const domain2Name = 'domain' + common.getUniqueString() + '.com';
			const passwordNew = 'test123new';

			adminAuthToken = await soap.getAdminAuthToken();

			// Create domain2
			const domRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateDomainRequest xmlns="urn:zimbraAdmin">
					<name>${domain2Name}</name>
				</CreateDomainRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(domRes.Fault, 'Response should not be a Fault');
			const domain2Id = Array.isArray(domRes.CreateDomainResponse.domain)
				? domRes.CreateDomainResponse.domain[0].id
				: domRes.CreateDomainResponse.domain.id;

			// Create account on domain2
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${testAccountUser}@${domain2Name}</name>
					<password>${passwordNew}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(createRes.Fault, 'Response should not be a Fault');
			const acct = Array.isArray(createRes.CreateAccountResponse.account)
				? createRes.CreateAccountResponse.account[0]
				: createRes.CreateAccountResponse.account;
			const hostAttr = acct.a.find(a => a.n === 'zimbraMailHost');
			const domain2Server = hostAttr ? hostAttr._content : config.server;

			// Add virtualHost02
			const modRes1 = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain2Id}</id>
					<a n="zimbraVirtualHostname">${virtualHost02}</a>
				</ModifyDomainRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modRes1.Fault, 'Response should not be a Fault');
			let domain = Array.isArray(modRes1.ModifyDomainResponse.domain)
				? modRes1.ModifyDomainResponse.domain[0]
				: modRes1.ModifyDomainResponse.domain;

			// Verify response
			assert.exists(domain.id, 'domain id should exist');

			// Auth with virtualHost02 - should succeed
			// Send the message
			const authRes1 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.notExists(authRes1.Fault, 'Response should not be a Fault');
			assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');

			// GetAccountInfo
			const authToken1 = Array.isArray(authRes1.AuthResponse.authToken)
				? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
				: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

			// GetAccountInfoRequest
			const infoRes1 = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
				</GetAccountInfoRequest>`, authToken1, false, domain2Server
			);

			// Verify response
			assert.notExists(infoRes1.Fault, 'Response should not be a Fault');

			// Replace virtualHost02 with virtualHost03
			adminAuthToken = await soap.getAdminAuthToken();

			// ModifyDomainRequest
			await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain2Id}</id>
					<a n="zimbraVirtualHostname">${virtualHost03}</a>
				</ModifyDomainRequest>`, adminAuthToken
			);

			// Restart mailboxd
			await server.runCommand('sudo su - zimbra -c \'zmmailboxdctl restart\'');
			await new Promise(resolve => setTimeout(resolve, 10000));

			// Auth with virtualHost02 - should FAIL
			// Send the message
			const authRes2 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.isString(authRes2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(authRes2.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED for virtualHost02');

			// Auth without virtualHost - should FAIL
			// Send the message
			const authRes3 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.isString(authRes3.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(authRes3.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED without virtualHost');

			// Auth with virtualHost03 - should SUCCEED
			// Send the message
			const authRes4 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost03}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.notExists(authRes4.Fault, 'Response should not be a Fault');
			assert.match(String(authRes4.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');

			// GetAccountInfo
			const authToken4 = Array.isArray(authRes4.AuthResponse.authToken)
				? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
				: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;

			// GetAccountInfoRequest
			const infoRes2 = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
				</GetAccountInfoRequest>`, authToken4, false, domain2Server
			);

			// Verify response
			assert.notExists(infoRes2.Fault, 'Response should not be a Fault');

			// Remove all virtual hosts
			adminAuthToken = await soap.getAdminAuthToken();

			// ModifyDomainRequest
			const modRes3 = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain2Id}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modRes3.Fault, 'Response should not be a Fault');
			domain = Array.isArray(modRes3.ModifyDomainResponse.domain)
				? modRes3.ModifyDomainResponse.domain[0]
				: modRes3.ModifyDomainResponse.domain;
			assert.exists(domain.id, 'domain id should exist');

			// Restart mailboxd again
			await server.runCommand('sudo su - zimbra -c \'zmmailboxdctl restart\'');
			await new Promise(resolve => setTimeout(resolve, 10000));

			// Auth with virtualHost02 - should FAIL
			// Send the message
			const authRes5 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.isString(authRes5.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(authRes5.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');

			// Auth without virtualHost - should FAIL
			// Send the message
			const authRes6 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.isString(authRes6.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(authRes6.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');

			// Auth with virtualHost03 - should FAIL
			const authRes7 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost03}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.isString(authRes7.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(authRes7.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');

			// Auth with full domain name - should SUCCEED
			const authRes8 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);

			// Verify response
			assert.notExists(authRes8.Fault, 'Response should not be a Fault');
			assert.match(String(authRes8.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
		});
	}
});
