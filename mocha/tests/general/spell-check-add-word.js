import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('General > Spell Check Add Word', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Email, account2Email, account3Email;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `spellcheck${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `spellcheck${common.getUniqueString()}@${config.testDomain}`;
		account3Email = `spellcheck${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Add word to personal dictionary', async () => {
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Check spelling
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">abc</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		let misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);

		// Verify response
		assert.exists(misspelled.find(m => m.word === 'abc'),
			'abc should be misspelled initially');

		// Modify preferences
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefSpellIgnoreWord">abc</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not be a Fault');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">abc</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = res.CheckSpellingResponse.misspelled;
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'abc should not be misspelled after adding to dictionary');
	});


	it('Sanity | Add word to personal dictionary Verify that spell check is case sensitive', async () => {
		const authToken = await soap.getAccountAuthToken(account2Email);

		// Modify preferences
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefSpellIgnoreAllCaps">FALSE</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// Check spelling
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">efg</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		let misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);

		// Verify response
		assert.exists(misspelled.find(m => m.word === 'efg'),
			'efg should be misspelled');

		// Modify preferences
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefSpellIgnoreWord">efg</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">EFG</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		assert.exists(misspelled.find(m => m.word === 'EFG'),
			'EFG should still be misspelled (case sensitive)');
	});


	it('Sanity | Add multiple word to personal dictionary', async () => {
		const authToken = await soap.getAccountAuthToken(account3Email);

		// Check spelling
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">xyz lmn</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		let misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		const words = misspelled.map(m => m.word);

		// Verify response
		assert.include(words, 'xyz', 'xyz should be misspelled');
		assert.include(words, 'lmn', 'lmn should be misspelled');

		// Modify preferences
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="+zimbraPrefSpellIgnoreWord">xyz</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// ModifyPrefsRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="+zimbraPrefSpellIgnoreWord">lmn</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">xyz</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = res.CheckSpellingResponse.misspelled;
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'xyz should not be misspelled after adding to dictionary');
	});


	it('Sanity | Verify zimbraPrefSpellIgnoreAllCaps ignores string in ALL CAPS in CheckSpellingRequest', async () => {
		const authToken = await soap.getAccountAuthToken(account2Email);

		// Modify preferences
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefSpellIgnoreAllCaps">TRUE</pref>
			</ModifyPrefsRequest>`, authToken
		);

		// Check spelling
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">EFG</CheckSpellingRequest>',
			authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'EFG should not be misspelled when IgnoreAllCaps is TRUE');
	});
});
