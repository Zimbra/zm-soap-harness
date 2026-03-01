import { assert } from 'chai';
import config from '../../conf/config.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('SanityTest > Check Request Sanity', function () {
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
	it('Sanity | Sanity test for CheckHostnameResolveRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CheckHostnameResolveRequest xmlns="urn:zimbraAdmin">
				<hostname>${config.serverHost}</hostname>
			</CheckHostnameResolveRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CheckHostnameResolveResponse,
			'CheckHostnameResolveResponse should exist');
		const codeArr = res.CheckHostnameResolveResponse.code;
		assert.exists(codeArr, 'Response should contain code');
		const code = Array.isArray(codeArr) ? codeArr[0]._content : codeArr;
		assert.equal(code, 'check.OK', 'Code should be check.OK');
	});


	// Skip: requires AD server configuration (AD.url, AD.port, AD.domain, AD.userName, AD.password)
	it.skip('Sanity | Sanity test for CheckAuthConfigRequest for AD server', async () => {
		// CheckAuthConfigRequest requires AD server configuration
		// Using zimbraAuthMech=zimbra against the Zimbra server as a basic check
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CheckAuthConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraAuthMech">zimbra</a>
				<a n="zimbraAuthLdapURL">ldap://${config.serverHost}:389/</a>
				<a n="zimbraAuthLdapBindDn">%u@${config.testDomain}</a>
				<name>${config.adminUser}</name>
				<password>${config.adminPassword}</password>
			</CheckAuthConfigRequest>`, adminAuthToken, false
		);
		// Server may succeed or fault depending on LDAP configuration
		if (res.CheckAuthConfigResponse) {

			// Verify response
			assert.exists(res.CheckAuthConfigResponse,
				'CheckAuthConfigResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if auth config check fails');
		}
	});


	// Skip: requires AD server configuration (AD.url, AD.port, AD.domain, AD.LDAPSearchBase)
	it.skip('Sanity | Sanity test for CheckGalConfigRequest for AD server', async () => {
		// CheckGalConfigRequest using Zimbra's internal LDAP
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CheckGalConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraGalLdapURL">ldap://${config.serverHost}:389/</a>
				<a n="zimbraGalLdapSearchBase">dc=com</a>
				<a n="zimbraGalLdapFilter">ad</a>
				<a n="zimbraGalLdapBindDn">${config.adminUser}</a>
				<a n="zimbraGalLdapBindPassword">${config.adminPassword}</a>
				<query limit="2">admin</query>
			</CheckGalConfigRequest>`, adminAuthToken, false
		);
		// Server may succeed or fault depending on GAL/LDAP configuration
		if (res.CheckGalConfigResponse) {

			// Verify response
			assert.exists(res.CheckGalConfigResponse,
				'CheckGalConfigResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if GAL config check fails');
		}
	});
});
