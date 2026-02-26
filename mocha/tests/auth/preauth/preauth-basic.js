import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

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
		adminAuthToken = await soap.getAdminAuthToken();
		preauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';

		// Create domain with preauth key
		domain1Name = 'preauth.' + common.getUniqueString() + '.com';
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraPreAuthKey">${preauthKey}</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.exists(domRes.CreateDomainResponse, 'Should create domain1');

		// Create accounts on domain1
		account1Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		account2ForeignPrincipal = 'test:' + common.getUniqueString();
		account2Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account2ForeignPrincipal}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		account3Name = 'preauth' + common.getUniqueString() + '@' + domain1Name;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes3.CreateAccountResponse, 'Should create account3');

		// Create domain2 (no preauth key)
		domain2Name = 'preauth.' + common.getUniqueString() + '.com';
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		account4Name = 'preauth' + common.getUniqueString() + '@' + domain2Name;
		const createRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes4.CreateAccountResponse, 'Should create account4');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Preauth request - basic test. by=name', async () => {
		const timestamp = String(Date.now());
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(
			authRes.AuthResponse || authRes.Fault,
			'Should return AuthResponse or Fault for preauth by name'
		);
	});


	it('Sanity | Preauth request - basic test. by=id', async () => {
		const timestamp = String(Date.now());
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="id">${account1Id}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(
			authRes.AuthResponse || authRes.Fault,
			'Should return AuthResponse or Fault for preauth by id'
		);
	});


	it('Sanity | Preauth request - basic test. by=foreignPrincipal', async () => {
		const timestamp = String(Date.now());
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="foreignPrincipal">${account2ForeignPrincipal}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(
			authRes.AuthResponse || authRes.Fault,
			'Should return AuthResponse or Fault for preauth by foreignPrincipal'
		);
	});


	it('Sanity | Preauth request - basic test. preauthkey is only valid for 5 minutes', async () => {
		// Use a timestamp from 1 day ago with 10 min expiry — should fail
		const timestamp = String(Date.now() - 86400000);
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="600000">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(authRes.Fault, 'Should return Fault for expired preauth');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for expired preauth');
	});


	it('Functional | Preauth request - authenticate after the token expires, but while the preauth is still valid', async () => {
		const timestamp = String(Date.now());
		// 1 minute expiry — wait for it to expire
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(
			authRes.AuthResponse || authRes.Fault,
			'Should return AuthResponse or AUTH_FAILED'
		);
	});


	it('Functional | Preauth request - authenticate after the token expires, and after the preauth expires (5 mins)', async () => {
		// Use a timestamp from 10 minutes ago with 1 minute expiry
		const timestamp = String(Date.now() - 600000);
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(authRes.Fault, 'Should return Fault for expired preauth');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Preauth request - authenticate before the token expires, and before the preauth expires (5 mins)', async () => {
		// Use a timestamp from 10 minutes in the future with 1 minute expiry
		const timestamp = String(Date.now() + 600000);
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="60000">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(authRes.Fault, 'Should return Fault for future timestamp');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for future timestamp');
	});


	it('Functional | Preauth request - use name when id is expected', async () => {
		const timestamp = String(Date.now());
		// Generate preauth using account id, but send account name in the request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(
			authRes.Fault,
			'Should return Fault for mismatched preauth key/account'
		);
		assert.match(
			authRes.Fault.Detail.Error.Code,
			/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
			'Should return AUTH_FAILED or INVALID_REQUEST'
		);
	});


	it('Sanity | Preauth request - use preauth against a domain that does not have preauth configured', async () => {
		const timestamp = String(Date.now());
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);
		assert.exists(authRes.Fault, 'Should return Fault for unconfigured domain');
		assert.match(
			authRes.Fault.Detail.Error.Code,
			/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
			'Should return AUTH_FAILED or INVALID_REQUEST'
		);
	});
});
