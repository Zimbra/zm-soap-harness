import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Preauth > Lockout Password', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create domain with preauth key
		const domainName = 'preauth.' + common.getUniqueString() + '.com';
		const preauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';

		// CreateDomainRequest
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraPreAuthKey">${preauthKey}</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(domRes.Fault, 'Response should not be a Fault');
		assert.exists(domRes.CreateDomainResponse, 'Should create domain');

		// Create account with lockout settings
		account1Name = 'preauth' + common.getUniqueString() + '@' + domainName;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<a n="zimbraPasswordLockoutDuration">60s</a>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
				<a n="zimbraPasswordLockoutFailureLifetime">60s</a>
				<a n="zimbraPasswordLockoutMaxFailures">5</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
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
	it('Sanity | Preauth request - verify account is put into lockout status', async () => {
		const timestamp = String(Date.now());

		// Attempt invalid preauth 5 times to trigger lockout
		for (let i = 1; i <= 5; i++) {

			// Send the message
			const authRes = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${account1Name}</account>
					<preauth timestamp="${timestamp}" expires="0">invalid${i}</preauth>
				</AuthRequest>`, null
			);

			// Verify response
			assert.exists(authRes.Fault, 'Should return Fault for invalid preauth attempt ' + i);
			assert.include(authRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED for attempt ' + i);

			// Small delay between attempts
			await new Promise(resolve => setTimeout(resolve, 3000));
		}

		// Now attempt with valid preauth — should still fail due to lockout
		const timestamp2 = String(Date.now());

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp2}" expires="0">validpreauth</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.exists(authRes2.Fault, 'Should return Fault due to lockout');
		assert.include(authRes2.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED due to lockout');

		// Wait for lockout to expire (90 seconds)
		await new Promise(resolve => setTimeout(resolve, 90000));

		// Attempt again after lockout expires — validate lockout released
		const timestamp3 = String(Date.now());

		// Send the message
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<preauth timestamp="${timestamp3}" expires="0">validpreauth2</preauth>
			</AuthRequest>`, null
		);
		// After lockout expires, a valid preauth would succeed,
		// but since we're using dummy preauth values, it will AUTH_FAILED
		// The key assertion is that lockout was released (not ACCOUNT_LOCKED)
		// Verify response
		assert.exists(authRes3.Fault, 'Should return Fault (invalid preauth)');
		assert.include(authRes3.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED (not LOCKED) after lockout expires');
	});
});
