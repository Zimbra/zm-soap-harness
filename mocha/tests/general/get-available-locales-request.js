import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('General > Get Available Locales Request', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify that proper response is obtained when GetAvailableLocalesRequest is fired', async () => {
		// GetAvailableLocalesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAvailableLocalesRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetAvailableLocalesResponse,
			'GetAvailableLocalesResponse should exist');
		const locales = Array.isArray(res.GetAvailableLocalesResponse.locale)
			? res.GetAvailableLocalesResponse.locale
			: [res.GetAvailableLocalesResponse.locale];
		const enUS = locales.find(l => l.id === 'en_US');

		// Verify response
		assert.exists(enUS, 'Should find en_US locale');
		assert.equal(enUS.name, 'English (United States)',
			'en_US locale name should match');
	});


	it('Sanity | Verify All available locales are obtained by GetAvailableLocalesRequest', async () => {
		// GetAvailableLocalesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAvailableLocalesRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const locales = Array.isArray(res.GetAvailableLocalesResponse.locale)
			? res.GetAvailableLocalesResponse.locale
			: [res.GetAvailableLocalesResponse.locale];

		const expectedLocales = [
			{ id: 'en_US', name: 'English (United States)' },
			{ id: 'en_AU', name: 'English (Australia)' },
			{ id: 'en_GB', name: 'English (United Kingdom)' },
			{ id: 'fr', name: 'français' },
			{ id: 'de', name: 'Deutsch' },
			{ id: 'it', name: 'italiano' },
			{ id: 'ja', name: '日本語' },
			{ id: 'ko', name: '한국어' },
			{ id: 'pl', name: 'polski' },
			{ id: 'pt_BR', name: 'português (Brasil)' },
			{ id: 'ru', name: 'русский' },
			{ id: 'es', name: 'español' },
			{ id: 'sv', name: 'svenska' },
			{ id: 'tr', name: 'Türkçe' },
			{ id: 'nl', name: 'Nederlands' },
			{ id: 'da', name: 'Dansk' },
			{ id: 'zh_CN', name: '中文 (中国)' },
			{ id: 'zh_HK', name: '中文 (香港)' },
			{ id: 'hi', name: 'हिंदी' },
		];

		for (const expected of expectedLocales) {
			const found = locales.find(l => l.id === expected.id);

			// Verify response
			assert.exists(found,
				`Should find available locale ${expected.id} (${expected.name})`);
		}
	});
});
