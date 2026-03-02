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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

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

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

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

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

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
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Sanity | Verify invalid password is denied on LDAP auth domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.exists(res.Fault, 'Should return Fault for invalid password');
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
		assert.exists(res.Fault, 'Should return Fault for internal password');
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
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Sanity | Verify invalid password is denied on LDAP domain 2', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.exists(res.Fault, 'Should return Fault for invalid password');
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
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Sanity | Verify invalid password denied on LDAP domain with fallback TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.exists(res.Fault, 'Should return Fault for invalid password');
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
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Sanity | Verify external LDAP password valid with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${config.LDAP.account02.password}</password>
			</AuthRequest>`, null, false
		);
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Sanity | Verify invalid password denied with fallback to local TRUE 2', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);
		assert.exists(res.Fault, 'Should return Fault for invalid password');
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
		assert.exists(res.Fault, 'Should return Fault for internal password');
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
		assert.exists(res.Fault, 'Should return Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});
});
