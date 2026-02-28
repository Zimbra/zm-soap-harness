import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Preauth > Preauth', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let domain1Name;
	let preauthKey;
	let account1Name;
	let account2Name;
	let account3Name;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		preauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';

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
		assert.exists(domRes.CreateDomainResponse, 'Should create domain');

		account1Name = 'user' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		account2Name = 'user2' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		account3Name = 'user3' + common.getUniqueString() + '@' + domain1Name;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes3.Fault, 'Response should not be a Fault');
		assert.exists(createRes3.CreateAccountResponse, 'Should create account3');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Preauth request - random preauth key used', async () => {
		const timestamp = String(Date.now());
		const randomKey = '640ce5f2779a14552c02b6822972a0584cf0d08b';

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${randomKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes.Fault, 'Should return Fault for random preauth key');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for random key');
	});


	it('Sanity | Preauth request - account2 uses account1s preauthcode', async () => {
		const timestamp = String(Date.now());
		// Generate preauth for account1 but use it for account2
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes.Fault, 'Should return Fault for cross-account preauth');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for cross-account preauth');
	});


	it('Functional | Preauth request - wrong timestamp used', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${String(Date.now())}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes.Fault, 'Should return Fault for wrong timestamp');
		assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for wrong timestamp');
	});


	it('Functional | Preauth request - wrong expires used', async () => {
		const timestamp = String(Date.now());
		// Generate with expires=60000 but send with expires=0
		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="0">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes1.Fault, 'Should return Fault for wrong expires (first)');
		assert.include(authRes1.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for wrong expires (first)');

		// Generate with expires=60000 but send with expires=10000
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="10000">${preauthKey}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes2.Fault, 'Should return Fault for wrong expires (second)');
		assert.include(authRes2.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for wrong expires (second)');
	});


	it('Functional | Preauth request - no preauth key () specified', async () => {
		const timestamp = String(Date.now());

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Name}</account>
				<preauth timestamp="${timestamp}" expires="0"></preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes.Fault, 'Should return Fault for empty preauth key');
		assert.match(
			authRes.Fault.Detail.Error.Code,
			/account\.AUTH_FAILED|service\.INVALID_REQUEST/,
			'Should return AUTH_FAILED or INVALID_REQUEST for empty key'
		);
	});
});
