import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Get Spell Dictionaries Request', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `acc${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | GetSpellDictionariesRequest', async () => {
		// GetSpellDictionariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetSpellDictionariesRequest xmlns="urn:zimbraMail">
			</GetSpellDictionariesRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetSpellDictionariesResponse,
			'GetSpellDictionariesResponse should exist');
		const dictionaries = Array.isArray(res.GetSpellDictionariesResponse.dictionary)
			? res.GetSpellDictionariesResponse.dictionary
			: [res.GetSpellDictionariesResponse.dictionary];

		// Verify response
		assert.include(dictionaries.map(d => typeof d === 'string' ? d : d._content), 'en_US',
			'Should contain en_US dictionary');
	});
});
