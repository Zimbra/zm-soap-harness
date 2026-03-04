import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Get All Locales Request', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
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
	it('Smoke | Verify that proper response is obtained when GetAllLocalesRequest is fired', async () => {
		// GetAllLocalesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAllLocalesRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const locales = Array.isArray(res.GetAllLocalesResponse.locale)
			? res.GetAllLocalesResponse.locale : [res.GetAllLocalesResponse.locale];
		const enUS = locales.find(l => l.id === 'en_US');

		// Verify response
		assert.exists(enUS, 'Should find en_US locale');
		assert.equal(enUS.name, 'English (United States)',
			'en_US locale name should match');
	});


	it('Sanity | Verify All locales obtained by GetAllLocalesRequest', async () => {
		// GetAllLocalesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAllLocalesRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const locales = Array.isArray(res.GetAllLocalesResponse.locale)
			? res.GetAllLocalesResponse.locale : [res.GetAllLocalesResponse.locale];

		const expectedLocales = [
			{ id: 'en_US', name: 'English (United States)' },
			{ id: 'fr', name: 'français' },
			{ id: 'de', name: 'Deutsch' },
			{ id: 'ja_JP', name: '日本語 (日本)' },
			{ id: 'ko', name: '한국어' },
			{ id: 'zh_CN', name: '中文 (中国)' },
			{ id: 'zh_TW', name: '中文 (台灣)' },
			{ id: 'it', name: 'italiano' },
			{ id: 'es', name: 'español' },
			{ id: 'pt_BR', name: 'português (Brasil)' },
			{ id: 'ru', name: 'русский' },
			{ id: 'pl', name: 'polski' },
			{ id: 'nl', name: 'Nederlands' },
			{ id: 'sv_SE', name: 'svenska (Sverige)' },
			{ id: 'tr', name: 'Türkçe' },
		];

		for (const expected of expectedLocales) {
			const found = locales.find(l => l.id === expected.id);

			// Verify response
			assert.exists(found,
				`Should find locale ${expected.id} (${expected.name})`);
		}
	});
});
