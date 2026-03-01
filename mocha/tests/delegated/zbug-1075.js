import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Delegated > ZBUG 1075', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const defaultPassword = config.defaultPassword;
	const uniqueStr = common.getUniqueString();
	const domainName1 = `dom1${uniqueStr}.com`;
	const domainName2 = `dom2${uniqueStr}.com`;
	const localPart = `delAccount1.${uniqueStr}`;
	let granteeAccount1, granteeAccount2;
	let userAccount1, userAccount2;
	let dn;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		granteeAccount1 = `${localPart}@${domainName1}`;
		granteeAccount2 = `delAccount2.${uniqueStr}@${domainName2}`;
		userAccount1 = `account1.${uniqueStr}@${domainName1}`;
		userAccount2 = `account2.${uniqueStr}@${domainName2}`;
		dn = `uid=${localPart},ou=people,dc=dom1${uniqueStr},dc=com`;

		// Create domain1
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName1}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDomainRequest for domain1 should not fault');

		// Create delegated admin account1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${granteeAccount1}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccountRequest for grantee1 should not fault');

		// Create user account1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${userAccount1}</name>
				<password>${defaultPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccountRequest for user1 should not fault');

		// Grant domainAdminConsoleRights for domain1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="domain" by="name">${domainName1}</target>
				<grantee type="usr" by="name">${granteeAccount1}</grantee>
				<right>domainAdminConsoleRights</right>
			</GrantRightRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GrantRightRequest for domain1 should not fault');

		// Create domain2
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName2}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDomainRequest for domain2 should not fault');

		// Create delegated admin account2
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${granteeAccount2}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccountRequest for grantee2 should not fault');

		// Create user account2
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${userAccount2}</name>
				<password>${defaultPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccountRequest for user2 should not fault');

		// Grant domainAdminConsoleRights for domain2
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="domain" by="name">${domainName2}</target>
				<grantee type="usr" by="name">${granteeAccount2}</grantee>
				<right>domainAdminConsoleRights</right>
			</GrantRightRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GrantRightRequest for domain2 should not fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify all accounts are returned', async () => {
		// GetLDAPEntriesRequest as global admin
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetLDAPEntriesRequest query="sn=*" xmlns="urn:zimbraAdmin">
				<ldapSearchBase>dc=com</ldapSearchBase>
			</GetLDAPEntriesRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetLDAPEntriesRequest should not fault');
		assert.exists(res.GetLDAPEntriesResponse, 'GetLDAPEntriesResponse should exist');

		// Verify both user accounts are in the response
		const entries = res.GetLDAPEntriesResponse.LDAPEntry;

		// Verify response
		assert.isArray(entries, 'Should return LDAPEntry array');

		// Check that user accounts are present
		const allMails = entries.flatMap(entry =>
			(Array.isArray(entry.a) ? entry.a : [entry.a]).filter(a => a && a.n === 'mail').map(a => a._content)
		);

		// Verify response
		assert.include(allMails, userAccount1, 'Should contain user account1');
		assert.include(allMails, userAccount2, 'Should contain user account2');

		// Verify userPassword is VALUE-BLOCKED
		const allPasswords = entries.flatMap(entry =>
			(Array.isArray(entry.a) ? entry.a : [entry.a])
				.filter(a => a && a.n === 'userPassword').map(a => a._content)
		);
		if (allPasswords.length > 0) {

			// Verify response
			assert.include(allPasswords, 'VALUE-BLOCKED',
				'userPassword should be VALUE-BLOCKED');
		}
	});


	it('Sanity | Verify delegated admin can not promote himself to global admin', async () => {
		// Auth as delegated admin1
		// Send the message
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${granteeAccount1}</account>
				<password>${defaultPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(res.Fault, 'AuthRequest as admin1 should not fault');
		const admin1Token = res.AuthResponse.authToken;

		// Try to promote self to global admin - should be denied
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyLDAPEntryRequest dn="${dn}" xmlns="urn:zimbraAdmin">
				<a n="zimbraIsAdminAccount">TRUE</a>
			</ModifyLDAPEntryRequest>`, admin1Token
		);

		// Verify response
		assert.exists(res.Fault, 'ModifyLDAPEntryRequest should return Fault');
		assert.isTrue(
			res.Fault.Detail.Error.Code.includes('service.PERM_DENIED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'),
			'Should be PERM_DENIED or AUTH_REQUIRED for admin1'
		);

		// Auth as delegated admin2
		// Send the message
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${granteeAccount2}</account>
				<password>${defaultPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(res.Fault, 'AuthRequest as admin2 should not fault');
		const admin2Token = res.AuthResponse.authToken;

		// Try to promote self to global admin - should be denied
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyLDAPEntryRequest dn="${dn}" xmlns="urn:zimbraAdmin">
				<a n="zimbraIsAdminAccount">TRUE</a>
			</ModifyLDAPEntryRequest>`, admin2Token
		);

		// Verify response
		assert.exists(res.Fault, 'ModifyLDAPEntryRequest should return Fault');
		assert.isTrue(
			res.Fault.Detail.Error.Code.includes('service.PERM_DENIED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'),
			'Should be PERM_DENIED or AUTH_REQUIRED for admin2'
		);
	});
});
