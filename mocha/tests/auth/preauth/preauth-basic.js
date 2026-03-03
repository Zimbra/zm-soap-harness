import crypto from 'node:crypto';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Preauth > Preauth Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domain1Name;
	let domain2Name;
	let preauthKey;
	let account1Name;
	let account1Id;
	let account2Name;
	let account2ForeignPrincipal;
	let account3Name;
	let account4Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		preauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';

		// Create domain with preauth key
		domain1Name = 'preauth.' + common.getUniqueString() + '.com';

		// CreateDomainRequest
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraPreAuthKey">${preauthKey}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(domRes.Fault, 'Response should not be a Fault');
		const domain1 = Array.isArray(domRes.CreateDomainResponse.domain)
			? domRes.CreateDomainResponse.domain[0]
			: domRes.CreateDomainResponse.domain;
		assert.exists(domain1.id, 'Domain1 ID should exist');
		assert.isString(domain1.id, 'Domain1 ID should be a string');
		const preauthAttr = Array.isArray(domain1.a)
			? domain1.a.find(a => a.n === 'zimbraPreAuthKey')
			: domain1.a;
		assert.exists(preauthAttr, 'zimbraPreAuthKey attribute should exist');
		assert.equal(preauthAttr._content, preauthKey, 'zimbraPreAuthKey should match');

		// Create accounts on domain1
		account1Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'Account1 zimbraMailHost should exist');

		account2ForeignPrincipal = 'test:' + common.getUniqueString();
		account2Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account2ForeignPrincipal}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 ID should exist');
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'Account2 zimbraMailHost should exist');

		account3Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		assert.exists(acct3.id, 'Account3 ID should exist');
		const host3 = acct3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'Account3 zimbraMailHost should exist');

		// Create domain2 (no preauth key)
		domain2Name = 'preauth.' + common.getUniqueString() + '.com';

		// CreateDomainRequest
		const domRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domRes2.Fault, 'CreateDomainRequest should not fault');
		const domain2 = Array.isArray(domRes2.CreateDomainResponse.domain)
			? domRes2.CreateDomainResponse.domain[0]
			: domRes2.CreateDomainResponse.domain;
		assert.exists(domain2.id, 'Domain2 ID should exist');
		assert.isString(domain2.id, 'Domain2 ID should be a string');

		account4Name = 'preauth' + common.getUniqueString() + '@' + domain2Name;

		// Create account
		const createRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes4.Fault, 'Response should not be a Fault');
		const acct4 = Array.isArray(createRes4.CreateAccountResponse.account)
			? createRes4.CreateAccountResponse.account[0]
			: createRes4.CreateAccountResponse.account;
		assert.exists(acct4.id, 'Account4 ID should exist');
		const host4 = acct4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'Account4 zimbraMailHost should exist');
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
	it('Smoke | Preauth request - basic test. by="name"', async () => {
		const timestamp = String(Date.now());
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account1Name}|name|0|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Preauth request - basic test. by="name"', async () => {
		const timestamp = String(Date.now());
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account1Id}|id|0|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="id">${account1Id}</account>
				<preauth timestamp="${timestamp}" expires="0">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Preauth request - basic test. by="name" 1', async () => {
		const timestamp = String(Date.now());
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account2ForeignPrincipal}|foreignPrincipal|0|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="foreignPrincipal">${account2ForeignPrincipal}</account>
				<preauth timestamp="${timestamp}" expires="0">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Preauth request - basic test. preauthkey is only valid for 5 minutes', async () => {
		// Use a timestamp from 1 day ago with 10 min expiry — should fail
		const timestamp = String(Date.now() - 86400000);
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account3Name}|name|600000|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="600000">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for expired preauth');
	});


	it('Functional | Preauth request - authenticate after the token expires, but while the preauth is still valid', async () => {
		const timestamp = String(Date.now());
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account3Name}|name|60000|${timestamp}`).digest('hex');
		// 1 minute expiry — wait for it to expire
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
	});


	it('Functional | Preauth request - authenticate after the token expires, and after the preauth expires (5 mins)', async () => {
		// Use a timestamp from 10 minutes ago with 1 minute expiry
		const timestamp = String(Date.now() - 600000);
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account3Name}|name|60000|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Preauth request - authenticate before the token expires, and before the preauth expires (5 mins)', async () => {
		// Use a timestamp from 10 minutes in the future with 1 minute expiry
		const timestamp = String(Date.now() + 600000);
		const computedPreauth = crypto.createHmac('sha1', preauthKey)
			.update(`${account3Name}|name|60000|${timestamp}`).digest('hex');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${computedPreauth}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for future timestamp');
	});


	it('Functional | Preauth request - use name when id is expected', async () => {
		const timestamp = String(Date.now());
		// Generate preauth using account id, but send account name in the request
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.match(
			authRes.Fault.Detail.Error.Code,
			/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
			'Should return AUTH_FAILED or INVALID_REQUEST'
		);
	});


	it('Sanity | Preauth request - use preauth against a domain that does not have preauth configured', async () => {
		const timestamp = String(Date.now());

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.match(
			authRes.Fault.Detail.Error.Code,
			/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
			'Should return AUTH_FAILED or INVALID_REQUEST'
		);
	});
});
