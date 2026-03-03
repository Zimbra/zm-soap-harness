import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > GAL > Galaccount > Sync GAL Request', function () {
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
	it('Smoke | SyncGal in GAL account mode', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
	});


	it('Sanity | SyncGal with incremental token', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		const token = res1.SyncGalResponse.token;
		if (token) {
			const res2 = await soap.makeSOAPEnvelopeAccount(
				`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}"/>`, accountToken
			);

			// Verify response
			assert.notExists(res2.Fault, 'SyncGal should not be a Fault');
		}
	});


	it('Sanity | SyncGal verify response structure', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
	});


	it('Sanity | SyncGal after account modification', async () => {
		const newEmail = `syncacc${common.getUniqueString()}@${config.testDomain}`;

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
	});
});
