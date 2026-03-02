import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > LDAP > Modify LDAP Entry Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account2Name;
	let account2Sn;
	let account1Email;
	let account3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account2Name = `account${common.getUniqueString()}`;
		account2Sn = `new.sn.${common.getUniqueString()}`;
		account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		account3Email = `account${common.getUniqueString()}@${config.testDomain}`;
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
	it('Smoke | Send basic ModifyLDAPEntryRequest', async () => {
		// Create LDAP entry
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${account2Name}">
				<a n="objectClass">organizationalPerson</a>
				<a n="sn">${account2Name}</a>
			</CreateLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateLDAPEntryRequest should not fault');

		// Modify LDAP entry
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${account2Name}">
				<a n="sn">${account2Sn}</a>
			</ModifyLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyLDAPEntryRequest should not fault');
		assert.exists(modRes.ModifyLDAPEntryResponse, 'ModifyLDAPEntryResponse should exist');
	});


	it('Sanity | Verify no NPE on ModifyLDAPEntryRequest for non-existent DN', async () => {
		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Get LDAP entry for the account
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetLDAPEntriesRequest xmlns="urn:zimbraAdmin">
				<ldapSearchBase>dc=com</ldapSearchBase>
				<query>cn=${account1Email.split('@')[0]}*</query>
			</GetLDAPEntriesRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetLDAPEntriesRequest should not fault');

		// Get LDAP entry name
		const entries = getRes.GetLDAPEntriesResponse.LDAPEntry;
		const entry = Array.isArray(entries) ? entries[0] : entries;
		const ldapEntryName = entry.name;
		assert.exists(ldapEntryName, 'LDAP entry name should exist');

		// Modify LDAP entry with invalid attribute — should fault but NOT with NPE
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${ldapEntryName}">
				<a n="zimbraQuotaWarnMessage">${common.getUniqueString()}</a>
			</ModifyLDAPEntryRequest>`, adminAuthToken, false
		);
		assert.exists(modRes.Fault, 'ModifyLDAPEntryRequest should fault for invalid DN');
		assert.include(modRes.Fault.Detail.Error.Code, 'service.FAILURE');
	});


	it('Sanity | ModifyLDAPEntryRequest should allow to remove attributes', async () => {
		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Re-create to get the DN from the error message
		const reCreateRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.exists(reCreateRes.Fault, 'Re-create should fault with duplicate');
		const reason = reCreateRes.Fault.Reason?.Text || '';
		const dnMatch = reason.match(/DN:(.*)$/);
		assert.isNotNull(dnMatch, 'DN should be present in fault reason');
		const account3Dn = dnMatch[1].trim();

		// Modify LDAP entry to remove zimbraCreateTimestamp
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="${account3Dn}">
				<a n="zimbraCreateTimestamp"/>
			</ModifyLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyLDAPEntryRequest should not fault');
		assert.exists(modRes.ModifyLDAPEntryResponse, 'ModifyLDAPEntryResponse should exist');

		// Flush cache
		await soap.makeSOAPEnvelopeAdmin(
			`<FlushCacheRequest xmlns="urn:zimbraAdmin">
				<cache type="account">
					<entry by="name">${account3Email}</entry>
				</cache>
			</FlushCacheRequest>`, adminAuthToken
		);

		// Verify attribute was removed
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account3Email}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
		const acct = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0] : getRes.GetAccountResponse.account;
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const createTimestamp = attrs.find(a => a.n === 'zimbraCreateTimestamp');
		assert.notExists(createTimestamp, 'zimbraCreateTimestamp should be removed');
	});
});
