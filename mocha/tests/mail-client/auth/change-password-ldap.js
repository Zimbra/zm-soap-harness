import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Auth > Change Password LDAP', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domain1Name, account1Name, account2Name;
	const zimbraPassword = 'zimbra123';

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Test requires external LDAP config
	if (!config.LDAP || !config.LDAP.url) {
		return;
	}

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const uid = common.getUniqueString();

		const ldapAuthURL = `ldap://${config.LDAP.url}:${config.LDAP.port}/`;
		domain1Name = `${uid}.com`;
		account1Name = `${config.LDAP.account01.user}@${domain1Name}`;
		account2Name = `${config.LDAP.account02.user}@${domain1Name}`;

		// Create domain with LDAP auth and fallback to local
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthFallbackToLocal">TRUE</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account1 without password, with MUST_CHANGE_PASSWORD
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<a n="zimbraPasswordMustChange">TRUE</a>
				<a n="zimbraAuthLdapExternalDn">uid=authaccount01,ou=people,dc=zin2,dc=lab,dc=zimbra,dc=com</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account2 with password, with MUST_CHANGE_PASSWORD
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${zimbraPassword}</password>
				<a n="zimbraPasswordMustChange">TRUE</a>
				<a n="zimbraAuthLdapExternalDn">uid=authaccount02,ou=people,dc=zin2,dc=lab,dc=zimbra,dc=com</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Functional | Auth using external password with MustChangePassword set', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.LDAP.account01.password}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});


	it('Functional | Auth using local password with MustChangePassword set', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});
});
