import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > ZCS-3390 - GAL delta sync fix', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | ZCS-3390 delta sync validation', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'SyncGal should not be a Fault');

		const token = res1.SyncGalResponse.token;
		if (token) {

			// Send sync gal request
			const res2 = await soap.makeSOAPEnvelopeAccount(
				`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}"/>`, accountToken
			);

			// Verify response
			assert.notExists(res2.Fault, 'SyncGal delta should not be a Fault');
		}
	});


	it('Sanity | ZCS-3390 SyncGal with new account added', async () => {
		const newEmail = `zcs3390test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send sync gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});
});
