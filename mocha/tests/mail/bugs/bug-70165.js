import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 70165', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Verify CheckSpellingRequest is working with existing word', async () => {
		// Create the account
		const accountEmail = `spellcheck.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send CheckSpellingRequest with existing word
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckSpellingRequest xmlns="urn:zimbraMail">hello</CheckSpellingRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CheckSpellingRequest should not fault');
		assert.notExists(res.CheckSpellingResponse.misspelled,
			'No misspelled words should be returned for a valid word');
	});


	it('Regression | Verify CheckSpellingRequest is working with a non existing word', async () => {
		// Create the account
		const accountEmail = `spellcheck.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send CheckSpellingRequest with non-existing word
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckSpellingRequest xmlns="urn:zimbraMail">helli</CheckSpellingRequest>`, accountAuthToken
		);

		// Verify response contains misspelled word
		assert.notExists(res.Fault, 'CheckSpellingRequest should not fault');
		const misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled : [res.CheckSpellingResponse.misspelled];
		assert.exists(misspelled[0], 'Misspelled entry should exist');
		assert.equal(misspelled[0].word, 'helli', 'Misspelled word should match');
	});
});
