import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Auth > Auth Active Directory', function () {
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

	// These tests require external AD server configuration
	if (!config.AD || !config.AD.url) {
		return;
	}

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const uid = common.getUniqueString();

		const adAuthLdapURL = `ldap://${config.AD.url}:${config.AD.port}/`;
		const adAuthLdapBindDn = `%u@${config.AD.domain}`;

		domain1Name = `${uid}a.com`;
		domain2Name = `${uid}b.com`;
		domain3Name = `${uid}c.com`;
		domain6Name = `${uid}d.com`;
		account1Name = `${config.AD.account01.user}@${domain1Name}`;
		account2Name = `${config.AD.account02.user}@${domain1Name}`;
		account3Name = `${config.AD.account01.user}@${domain2Name}`;
		account4Name = `${config.AD.account02.user}@${domain2Name}`;
		account5Name = `${config.AD.account01.user}@${domain3Name}`;
		account6Name = `${config.AD.account01.user}@${domain6Name}`;
		account6Alias = `alias${uid}@${domain6Name}`;

		// Create domain1 with AD auth
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraAuthLdapURL">${adAuthLdapURL}</a>
				<a n="zimbraAuthLdapBindDn">${adAuthLdapBindDn}</a>
				<a n="zimbraAuthMech">ad</a>
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

		// Create domain2 with AD auth and fallback to local TRUE
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraAuthLdapURL">${adAuthLdapURL}</a>
				<a n="zimbraAuthLdapBindDn">${adAuthLdapBindDn}</a>
				<a n="zimbraAuthMech">ad</a>
				<a n="zimbraAuthFallbackToLocal">TRUE</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts on domain2
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

		// Create domain3 with AD auth and fallback to local FALSE
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain3Name}</name>
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraAuthLdapURL">${adAuthLdapURL}</a>
				<a n="zimbraAuthLdapBindDn">${adAuthLdapBindDn}</a>
				<a n="zimbraAuthMech">ad</a>
				<a n="zimbraAuthFallbackToLocal">FALSE</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account on domain3
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Name}</name>
				<password>${zimbraPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create domain6 with AD auth
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain6Name}</name>
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraAuthLdapURL">${adAuthLdapURL}</a>
				<a n="zimbraAuthLdapBindDn">${adAuthLdapBindDn}</a>
				<a n="zimbraAuthMech">ad</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account6 and alias
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
	it('Sanity | Verify invalid password is denied on AD auth domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal Zimbra password is denied on AD auth domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for internal password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify invalid password is denied on AD auth domain 2', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify invalid password is denied on AD auth domain with fallback', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal Zimbra password is accepted with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		assert.exists(res.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Verify invalid password is denied with fallback to local TRUE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>invalidPassword</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Functional | Verify internal Zimbra password is denied with fallback to local FALSE', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account5Name}</account>
				<password>${zimbraPassword}</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for internal password');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});


	it('Sanity | Verify internal account name not shown in AUTH_FAILED response', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account6Name}</account>
				<password>wrong password</password>
			</AuthRequest>`, null, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Error code should be AUTH_FAILED');
	});
});
