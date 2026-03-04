import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Spell Check', function () {
	this.timeout(60 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `spellcheck${common.getUniqueString()}@${config.testDomain}`;

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
	it('Smoke | CheckSpelling of any word', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">hello</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello should not be misspelled');
	});


	it('Sanity | CheckSpelling of a non existing word', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">helli</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		const found = misspelled.find(m => m.word === 'helli');

		// Verify response
		assert.exists(found, 'helli should be misspelled');
	});


	it('Functional | CheckSpelling of word but in capital letters', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">HELLO</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'HELLO should not be misspelled');
	});


	it('Functional | CheckSpelling of a word, whose alphabets are in capital and small letters, both', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">HeLLo</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		const found = misspelled.find(m => m.word === 'HeLLo');

		// Verify response
		assert.exists(found, 'HeLLo should be misspelled');
	});


	it('Functional | CheckSpelling of a word with special character()', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">hello!</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello! should not be misspelled');
	});


	it('Functional | CheckSpelling of two words', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">hello world</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello world should not be misspelled');
	});


	it('Functional | CheckSpelling of a word with spaces', async () => {
		// CheckSpellingRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">                   hello</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		let misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello with leading spaces should not be misspelled');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">hello                   </CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = res.CheckSpellingResponse.misspelled;
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello with trailing spaces should not be misspelled');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">         hello          </CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = res.CheckSpellingResponse.misspelled;
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'hello with both spaces should not be misspelled');
	});


	it('Functional | CheckSpellingRequest for blank,spaces,spchar,digit,decimal,negative', async () => {
		// CheckSpellingRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail"></CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Blank check should not fault');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">     </CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Spaces check should not fault');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">1</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Digit check should not fault');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">12.34</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Decimal check should not fault');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">-1</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Negative check should not fault');
	});


	it('Functional | CheckSpelling of a correct sentence', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">Hello! Good Morning!!</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'Correct sentence should not have misspelled words');
	});


	it('Functional | CheckSpelling of a sentence in which one word is wrong', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">Hello! Gud Morning!!</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		const found = misspelled.find(m => m.word === 'Gud');

		// Verify response
		assert.exists(found, 'Gud should be marked as misspelled');
	});


	it('Functional | CheckSpelling of a sentence in which all words are wrong', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">Helloo! Gud Mornin!!</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = Array.isArray(res.CheckSpellingResponse.misspelled)
			? res.CheckSpellingResponse.misspelled
			: (res.CheckSpellingResponse.misspelled
				? [res.CheckSpellingResponse.misspelled] : []);
		const words = misspelled.map(m => m.word);

		// Verify response
		assert.include(words, 'Helloo', 'Helloo should be misspelled');
		assert.include(words, 'Gud', 'Gud should be misspelled');
		assert.include(words, 'Mornin', 'Mornin should be misspelled');
	});


	it('Functional | CheckSpelling of a multi line statement', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckSpellingRequest xmlns="urn:zimbraMail">Hello!
Good Morning!!
Have a nice day!!!
</CheckSpellingRequest>`,
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'Correct multi-line statement should not have misspelled words');
	});


	it('Functional | CheckSpelling of a multi line statement that contains special characters, symbols, digits and spaces', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail"># Hello! Good Morning!! -432.45a Have a nice day #</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the word zimbra is correct', async () => {
		// CheckSpellingRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">ZIMBRA</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		let misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'ZIMBRA should not be misspelled');

		// Check spelling
		res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">Zimbra</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		misspelled = res.CheckSpellingResponse.misspelled;
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'Zimbra should not be misspelled');
	});


	it('Sanity | Verify various characters does not throw exception', async () => {
		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckSpellingRequest xmlns="urn:zimbraMail">
úó
sehr geehrte damen und herren
herzliche grüße
读写汉字 - 学中文
</CheckSpellingRequest>`,
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the word comcast is correct', async () => {
		// Modify preferences to ignore comcast
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="+zimbraPrefSpellIgnoreWord">comcast</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// CheckSpellingRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<CheckSpellingRequest xmlns="urn:zimbraMail">comcast</CheckSpellingRequest>',
			accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const misspelled = res.CheckSpellingResponse.misspelled;

		// Verify response
		assert.isTrue(!misspelled || (Array.isArray(misspelled) && misspelled.length === 0),
			'comcast should not be misspelled');
	});
});
