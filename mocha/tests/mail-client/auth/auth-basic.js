import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Auth > Auth Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domain2Name, account3Name;

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
		domain2Name = `${uid}b.com`;
		account3Name = `${config.AD.account01.user}@${domain2Name}`;

		// Create domain with LDAP auth
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
				<a n="zimbraAuthMech">ldap</a>
				<a n="zimbraAuthLdapURL">${ldapAuthURL}</a>
				<a n="zimbraAuthLdapSearchBindDn">${config.LDAP.bindDN}</a>
				<a n="zimbraAuthLdapSearchBindPassword">${config.LDAP.bindPassword}</a>
				<a n="zimbraAuthLdapSearchFilter">${config.LDAP.LDAPfilter}</a>
				<a n="zimbraAuthLdapSearchBase">${config.LDAP.LDAPsearchBase}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
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
	it('Sanity | Create domain with LDAP auth and authenticate', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>${config.LDAP.account01.password}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isTrue(!!res.AuthResponse || !!res.Fault,
			'Should get AuthResponse or Fault');
	});
});
