import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > Create Gal Sync Account Request', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Basic test - create a domain gal sync account', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse, 'Response should exist');
		const acct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
	});


	it('Sanity | Make an existing account the domain gal sync account', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create an existing account first
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${galAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;
		const mailHost = acct.a.find(a => a.n === 'zimbraMailHost')._content || acct.a.find(a => a.n === 'zimbraMailHost').content;

		// Make existing account the gal sync account
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}" server="${mailHost}">
				<account by="id">${accountId}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse, 'CreateGalSyncAccountResponse should exist');
	});


	it('Functional | Set the folder on the CreateGalSyncAccountRequest', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const folderName = `folder${common.getUniqueString()}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" folder="${folderName}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest with folder should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse, 'Response should exist');
		const acct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
	});


	it('Functional | Set a password on the CreateGalSyncAccountRequest', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
				<password>${config.accountPassword}</password>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest with password should not fault');
		const acct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		const galAccountId = acct.id;

		// Verify the account can auth with the password
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${galAccountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');

		// Try to auth as gal account
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${galAccountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest for gal account with password should not fault');
	});


	it('Functional | Try to auth for gal account without a password', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create gal sync account WITHOUT password
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');

		// Try to auth — should fail
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${galAccountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.exists(authRes.Fault, 'AuthRequest should fault for gal account without password');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Set attributes on the CreateGalSyncAccountRequest', async () => {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
				<a n="zimbraGalSyncLdapBindPassword">password</a>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest with attributes should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse, 'Response should exist');
		const acct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
	});


	it('Functional | Create gal account in one domain that manages gal in another domain', async () => {
		// Create two domains
		const domain1Name = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const domain2Name = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account in domain2
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domain2Name}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${galAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const mailHost = acct.a.find(a => a.n === 'zimbraMailHost')._content || acct.a.find(a => a.n === 'zimbraMailHost').content;

		// Create gal sync account in domain2 that manages domain1
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domain1Name}" server="${mailHost}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest cross-domain should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse, 'CreateGalSyncAccountResponse should exist');
	});
});
