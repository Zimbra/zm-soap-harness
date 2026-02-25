import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
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
		const acctId = acct.id;
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
		const acctId = acct.id;
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

		// Auth with virtual host 01
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccountUser}</account>
				<password>${passwordNew}</password>
				<virtualHost>${virtualHost01}</virtualHost>
			</AuthRequest>`, null, true, acctServer
		);
		assert.exists(authRes1.AuthResponse, 'Should auth with virtualHost01');

		// Auth with virtual host 02
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccountUser}</account>
				<password>${passwordNew}</password>
				<virtualHost>${virtualHost02}</virtualHost>
			</AuthRequest>`, null, true, acctServer
		);
		assert.exists(authRes2.AuthResponse, 'Should auth with virtualHost02');

		// Auth with virtual host 03
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccountUser}</account>
				<password>${passwordNew}</password>
				<virtualHost>${virtualHost03}</virtualHost>
			</AuthRequest>`, null, true, acctServer
		);
		assert.exists(authRes3.AuthResponse, 'Should auth with virtualHost03');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domain3Id}</id>
				<a n="zimbraVirtualHostname"></a>
			</ModifyDomainRequest>`, adminAuthToken
		);
	});
});
