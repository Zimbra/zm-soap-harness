import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import server from '../../../framework/backend/server-command.js';

describe('Auth > Virtualhost > Auth Virtualhost', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let testAccountUser;
	let testAccountServer;
	let defaultDomainName;
	let testDomainName;

	before(async function () {
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
		assert.exists(createRes1.CreateAccountResponse,
			'Should create account on default domain');
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

	// Tests
	if (config.serial !== true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Sanity | Virtual Host Test: AuthRequest - login as from virtual host, no virtual hosts defined Should use test_account1@defaultdomain/password to authenticate', async () => {
			const virtualHost = 'v' + common.getUniqueString() + '.virtual.com';
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}</password>
					<virtualHost>${virtualHost}</virtualHost>
				</AuthRequest>`, null, true, testAccountServer
			);
			assert.exists(response.AuthResponse, 'AuthResponse should exist');
			assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		});


		it('Sanity | Virtual Host Test: AuthRequest - login with virtual host password', async () => {
			const virtualHost = 'v' + common.getUniqueString() + '.virtual.com';
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}v</password>
					<virtualHost>${virtualHost}</virtualHost>
				</AuthRequest>`, null, true, testAccountServer
			);
			if (response.Fault) {
				assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
					'Should fail with AUTH_FAILED');
			} else {
				assert.fail('Expected Fault for wrong password');
			}
		});


		it('Sanity | Virtual Host Test: AuthRequest - login with full account name', async () => {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${testDomainName}</account>
					<password>${config.accountPassword}v</password>
					<virtualHost>v${common.getUniqueString()}.virtual.com</virtualHost>
				</AuthRequest>`, null, true
			);
			assert.exists(response.AuthResponse, 'AuthResponse should exist');
			assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		});


		it('Sanity | Virtual Host Test: AuthRequest - login using default/good password', async () => {
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
			assert.exists(domainRes.CreateDomainResponse, 'Should create domain');

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
			assert.exists(createRes.CreateAccountResponse, 'Should create account');

			const acct = Array.isArray(createRes.CreateAccountResponse.account)
				? createRes.CreateAccountResponse.account[0]
				: createRes.CreateAccountResponse.account;
			const host = acct.a.find(a => a.n === 'zimbraMailHost');
			const acctServer = host ? host._content : config.server;

			// Auth using virtual host
			const authRes = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${config.accountPassword}${domain1Name}</password>
					<virtualHost>${virtualHost01}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);
			assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
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
			assert.exists(infoRes.GetAccountInfoResponse,
				'GetAccountInfoResponse should exist');

			// Cleanup virtual host
			await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domainId}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);
		});


		it('Sanity | Basic Test: AuthRequest - login using default/good password - multiple virtual hosts', async () => {
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
			assert.exists(modRes.ModifyDomainResponse, 'ModifyDomainResponse should exist');
			const domain = Array.isArray(modRes.ModifyDomainResponse.domain)
				? modRes.ModifyDomainResponse.domain[0]
				: modRes.ModifyDomainResponse.domain;
			assert.exists(domain.id, 'domain id should exist');

			// Auth with virtual host 01
			const authRes1 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost01}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);
			assert.exists(authRes1.AuthResponse, 'Should auth with virtualHost01');
			assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

			// Auth with virtual host 02
			const authRes2 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);
			assert.exists(authRes2.AuthResponse, 'Should auth with virtualHost02');
			assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
			assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

			// Auth with virtual host 03
			const authRes3 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost03}</virtualHost>
				</AuthRequest>`, null, true, acctServer
			);
			assert.exists(authRes3.AuthResponse, 'Should auth with virtualHost03');
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
		it('Serial | Adding and removing virtual host - verify auth after mailboxd restart', async function () {
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
			assert.exists(domRes.CreateDomainResponse, 'Should create domain2');
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
			assert.exists(createRes.CreateAccountResponse, 'Should create account');
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
			assert.exists(modRes1.ModifyDomainResponse, 'Should modify domain');
			let domain = Array.isArray(modRes1.ModifyDomainResponse.domain)
				? modRes1.ModifyDomainResponse.domain[0]
				: modRes1.ModifyDomainResponse.domain;
			assert.exists(domain.id, 'domain id should exist');

			// Auth with virtualHost02 - should succeed
			const authRes1 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes1.AuthResponse, 'Should auth with virtualHost02');
			assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');

			// GetAccountInfo
			const authToken1 = Array.isArray(authRes1.AuthResponse.authToken)
				? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
				: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;
			const infoRes1 = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
				</GetAccountInfoRequest>`, authToken1, false, domain2Server
			);
			assert.exists(infoRes1.GetAccountInfoResponse, 'GetAccountInfoResponse should exist');

			// Replace virtualHost02 with virtualHost03
			adminAuthToken = await soap.getAdminAuthToken();
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
			const authRes2 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes2.Fault, 'Should fail auth with removed virtualHost02');
			assert.include(authRes2.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED for virtualHost02');

			// Auth without virtualHost - should FAIL
			const authRes3 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes3.Fault, 'Should fail auth without virtualHost');
			assert.include(authRes3.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED without virtualHost');

			// Auth with virtualHost03 - should SUCCEED
			const authRes4 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost03}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes4.AuthResponse, 'Should auth with virtualHost03');
			assert.match(String(authRes4.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');

			// GetAccountInfo
			const authToken4 = Array.isArray(authRes4.AuthResponse.authToken)
				? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
				: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;
			const infoRes2 = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
				</GetAccountInfoRequest>`, authToken4, false, domain2Server
			);
			assert.exists(infoRes2.GetAccountInfoResponse, 'GetAccountInfoResponse should exist');

			// Remove all virtual hosts
			adminAuthToken = await soap.getAdminAuthToken();
			const modRes3 = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain2Id}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);
			assert.exists(modRes3.ModifyDomainResponse, 'Should remove virtual hosts');
			domain = Array.isArray(modRes3.ModifyDomainResponse.domain)
				? modRes3.ModifyDomainResponse.domain[0]
				: modRes3.ModifyDomainResponse.domain;
			assert.exists(domain.id, 'domain id should exist');

			// Restart mailboxd again
			await server.runCommand('sudo su - zimbra -c \'zmmailboxdctl restart\'');
			await new Promise(resolve => setTimeout(resolve, 10000));

			// Auth with virtualHost02 - should FAIL
			const authRes5 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
					<virtualHost>${virtualHost02}</virtualHost>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes5.Fault, 'Should fail auth with virtualHost02 after removal');
			assert.include(authRes5.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');

			// Auth without virtualHost - should FAIL
			const authRes6 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes6.Fault, 'Should fail auth without virtualHost after removal');
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
			assert.exists(authRes7.Fault, 'Should fail auth with virtualHost03 after removal');
			assert.include(authRes7.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');

			// Auth with full domain name - should SUCCEED
			const authRes8 = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${testAccountUser}@${domain2Name}</account>
					<password>${passwordNew}</password>
				</AuthRequest>`, null, true, domain2Server
			);
			assert.exists(authRes8.AuthResponse, 'Should auth with full domain name');
			assert.match(String(authRes8.AuthResponse.lifetime), /^\d+$/,
				'lifetime should be numeric');
		});
	}
});
