import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Auth > Auth LDAP', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domain1Name, domain2Name, domain3Name, domain6Name;
	let account1Name, account2Name, account3Name, account4Name, account5Name, account6Name;
	let account6Alias;
	const zimbraPassword = 'zimbra123';

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// These tests require external LDAP server configuration
	if (!config.LDAP || !config.LDAP.url) {
		return;
	}

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const uid = common.getUniqueString();

		const ldapAuthURL = `ldap://${config.LDAP.url}:${config.LDAP.port}/`;

		domain1Name = `${uid}a.com`;
		domain2Name = `${uid}b.com`;
		domain3Name = `${uid}c.com`;
		domain6Name = `${uid}d.com`;
		account1Name = `${config.LDAP.account01.user}@${domain1Name}`;
		account2Name = `${config.LDAP.account02.user}@${domain1Name}`;
		account3Name = `${config.LDAP.account01.user}@${domain2Name}`;
		account4Name = `${config.LDAP.account02.user}@${domain2Name}`;
		account5Name = `${config.LDAP.account01.user}@${domain3Name}`;
		account6Name = `${config.AD.account01.user}@${domain6Name}`;
		account6Alias = `alias${uid}@${domain6Name}`;

		// Create domain1 with LDAP auth
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts on domain1
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Create domain2 with LDAP auth and fallback TRUE
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
				<a n="zimbraAuthFallbackToLocal">TRUE</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
		const createAcctRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes4.Fault, 'CreateAccountRequest should not fault');
		const acctInfo4 = Array.isArray(createAcctRes4.CreateAccountResponse.account)
			? createAcctRes4.CreateAccountResponse.account[0]
			: createAcctRes4.CreateAccountResponse.account;
		assert.exists(acctInfo4.id, 'Account ID should exist');
		const host4 = acctInfo4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'zimbraMailHost should exist');

		// Create domain3 with LDAP auth and fallback FALSE
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain3Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
				<a n="zimbraAuthFallbackToLocal">FALSE</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const createAcctRes5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes5.Fault, 'CreateAccountRequest should not fault');
		const acctInfo5 = Array.isArray(createAcctRes5.CreateAccountResponse.account)
			? createAcctRes5.CreateAccountResponse.account[0]
			: createAcctRes5.CreateAccountResponse.account;
		assert.exists(acctInfo5.id, 'Account ID should exist');
		const host5 = acctInfo5.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host5, 'zimbraMailHost should exist');

		// Create domain6 with LDAP auth
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain6Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const acct6Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Name}</name>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct6 = Array.isArray(acct6Res.CreateAccountResponse?.account)
			? acct6Res.CreateAccountResponse.account[0] : acct6Res.CreateAccountResponse?.account;
		const acct6Id = acct6?.id;

		if (acct6Id) {
			await soap.makeSOAPEnvelopeAdmin(
				`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
					<id>${acct6Id}</id>
					<alias>${account6Alias}</alias>
				</AddAccountAliasRequest>`, adminAuthToken
			);
		}
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});



	// Tests
	it('Sanity | Authenticate with external LDAP password', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.LDAP.account01.password}</password>
			</AuthRequest>`, null, false
		);
		// Verify auth succeeds or fails depending on LDAP config
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify invalid password is denied on LDAP auth domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal Zimbra password is denied on LDAP auth domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for internal password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify external LDAP password is valid on domain with user who has local password', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.LDAP.account02.password}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify invalid password is denied on LDAP domain 2', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Auth with LDAP password on domain with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.LDAP.account01.password}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify invalid password denied on LDAP domain with fallback TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal Zimbra password accepted with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify external LDAP password valid with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${config.LDAP.account02.password}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify invalid password denied with fallback to local TRUE 2', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Functional | Verify internal Zimbra password denied with fallback to local FALSE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account5Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for internal password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal account name not shown in LDAP AUTH_FAILED', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account6Name}</account>
				<password>wrong password</password>
			</AuthRequest>`, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});
});
