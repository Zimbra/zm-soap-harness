import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Autocomplete I18n', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	// Contact data matching XML properties (contact15-contact44)
	const contacts = [
		{ id: 15, firstname: 'العربية', lastname: 'العربية الجزائر', email: 'arabic-temp@test118n.com', partialfirstname: 'العر', partiallastname: 'العرب', partialemail: 'arabic-temp@test' },
		{ id: 16, firstname: 'العربية', lastname: 'اربية الجزائر', email: 'ar@test118n.com', partialfirstname: 'العر', partiallastname: 'اربية', partialemail: 'ar@test1' },
		{ id: 17, firstname: 'беларускі', lastname: 'Беларусь', email: 'be@testi18n.com', partialfirstname: 'бе', partiallastname: 'Бел', partialemail: 'be@testi1' },
		{ id: 18, firstname: 'català', lastname: 'Espanya', email: 'ca@testi18n.com', partialfirstname: 'cat', partiallastname: 'Espa', partialemail: 'ca@te' },
		{ id: 19, firstname: 'български', lastname: 'ларусь', email: 'bg@testi18n.com', partialfirstname: 'бълг', partiallastname: 'лар', partialemail: 'bg@t' },
		{ id: 20, firstname: 'Österreich', lastname: 'deutsh', email: 'de@testi18n.com', partialfirstname: 'Ös', partiallastname: 'deu', partialemail: 'de@' },
		{ id: 21, firstname: 'ελληνικά', lastname: 'ελληνικά Ελλάδα', email: 'el@i18n.com', partialfirstname: 'ελλ', partiallastname: 'ελλη', partialemail: 'el@i' },
		{ id: 22, firstname: 'español', lastname: 'español', email: 'es@i18n.com', partialfirstname: 'esp', partiallastname: 'espa', partialemail: 'es@i1' },
		{ id: 23, firstname: 'français', lastname: 'français', email: 'fr@i18n.com', partialfirstname: 'fr', partiallastname: 'fra', partialemail: 'fr@i18n.' },
		{ id: 24, firstname: 'हिंदी', lastname: 'भारत', email: 'hi_IN@i18n.com', partialfirstname: 'हिंद', partiallastname: 'भार', partialemail: 'hi_IN' },
		{ id: 25, firstname: 'magyarszág', lastname: 'zág', email: 'hu_HU@i18n.com', partialfirstname: 'magy', partiallastname: 'zá', partialemail: 'hu_H' },
		{ id: 26, firstname: 'íslenska', lastname: 'íslenska', email: 'is@i18n.com', partialfirstname: 'ís', partiallastname: 'ísl', partialemail: 'is@i18n.c' },
		{ id: 27, firstname: 'עברית', lastname: 'עברית', email: 'iw@i18n.com', partialfirstname: 'עברית', partiallastname: 'עברית', partialemail: 'iw@i1' },
		{ id: 28, firstname: '日本語', lastname: '日本語', email: 'ja@i18n.com', partialfirstname: '日本語', partiallastname: '日本語', partialemail: 'ja@i1' },
		{ id: 29, firstname: '한국어', lastname: '한국어', email: 'ko@i18n.com', partialfirstname: '한국어', partiallastname: '한국어', partialemail: 'ko@i' },
		{ id: 30, firstname: 'Nederlands', lastname: 'België', email: 'nl_BE@i18n.com', partialfirstname: 'Ne', partiallastname: 'Belg', partialemail: 'nl_' },
		{ id: 31, firstname: 'português', lastname: 'português', email: 'pt@i18n.com', partialfirstname: 'por', partiallastname: 'port', partialemail: 'pt@i1' },
		{ id: 32, firstname: 'română', lastname: 'română', email: 'ro@i18n.com', partialfirstname: 'rom', partiallastname: 'româ', partialemail: 'ro@i18n' },
		{ id: 33, firstname: 'русский', lastname: 'русский', email: 'ru@i18n.com', partialfirstname: 'ру', partiallastname: 'рус', partialemail: 'ru@i18' },
		{ id: 34, firstname: 'Slovenčina', lastname: 'ovenčina', email: 'sk@i18n.com', partialfirstname: 'Sl', partiallastname: 'ove', partialemail: 'sk@i18' },
		{ id: 35, firstname: 'Slovenščina', lastname: 'Slovenščina', email: 'sl@i18n.com', partialfirstname: 'Sl', partiallastname: 'Slo', partialemail: 'sl@i18n.' },
		{ id: 36, firstname: 'shqipe Shqipëria', lastname: 'shqipe Shqipëria', email: 'sq_AL@i18n.com', partialfirstname: 'sh', partiallastname: 'shq', partialemail: 'sq_AL@i18n' },
		{ id: 37, firstname: 'Српски Босна и Херцеговина', lastname: 'ски Босна и Херцеговина', email: 'sr_BA@i18n.com', partialfirstname: 'Српс', partiallastname: 'ски', partialemail: 'sr_BA' },
		{ id: 38, firstname: 'Српски Србија и Црна Гора', lastname: 'Српски Србија и Црна Гора', email: 'sr_CS@i18n.com', partialfirstname: 'Српск', partiallastname: 'Српски', partialemail: 'sr_CS@i' },
		{ id: 39, firstname: 'ไทย', lastname: 'ไทย', email: 'th@i18n.com', partialfirstname: 'ไทย', partiallastname: 'ไทย', partialemail: 'th@i18n' },
		{ id: 40, firstname: 'українська', lastname: 'раїнська', email: 'uk@i18n.com', partialfirstname: 'укра', partiallastname: 'раїнс', partialemail: 'uk@i18n.' },
		{ id: 41, firstname: 'TiếngViệt', lastname: 'ng Việt', email: 'vi@i18n.com', partialfirstname: 'Ti', partiallastname: 'ng ', partialemail: 'vi@i18n' },
		{ id: 42, firstname: '中文', lastname: '中文', email: 'zh@i18n.com', partialfirstname: '中文', partiallastname: '中文', partialemail: 'zh@i' },
		{ id: 43, firstname: '中文 香港', lastname: '中文 香港', email: 'zh_HK@i18n.com', partialfirstname: '中文', partiallastname: '中文 ', partialemail: 'zh_HK' },
		{ id: 44, firstname: '中文 台灣', lastname: '中文 (台灣)', email: 'zh_TW@i18n.com', partialfirstname: '中文 ', partiallastname: '中文 ', partialemail: 'zh_TW@' },
	];

	// Map contact id → runtime contact ID (from CreateContactResponse)
	const contactIds = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		accountEmail = `acct${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account) ? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create all 30 i18n contacts
		for (const c of contacts) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">${c.firstname}</a>
						<a n="lastName">${c.lastname}</a>
						<a n="fullName">${c.firstname} ${c.lastname}</a>
						<a n="email">${c.email}</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
			assert.notExists(res.Fault, `CreateContact ${c.id} should not fault`);
			const cn = Array.isArray(res.CreateContactResponse.cn) ? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
			assert.exists(cn.id, `Contact ${c.id} ID should exist`);
			contactIds[c.id] = cn.id;
		}
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	/**
	 * Helper: sends AutoCompleteRequest and verifies the match contains the expected contact ID.
	 */
	async function verifyAutoComplete(searchTerm, expectedContactId, label) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${searchTerm}</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res.Fault, `AutoComplete(${label}) should not fault`);
		const matches = res.AutoCompleteResponse.match
			? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match])
			: [];
		assert.isAbove(matches.length, 0, `AutoComplete(${label}) should return matches`);
		const found = matches.some(m => String(m.id) === String(expectedContactId));
		assert.isTrue(found, `AutoComplete(${label}) should match contact ID ${expectedContactId}`);
	}

	// 32 test cases from XML, mapping each to its contact:
	// TC1 (smoke): contact15, TC2 (sanity): contact15
	// TC3 (sanity): contact16, TC4 (sanity): contact16
	// TC5-TC32 (sanity): contacts 17-44
	const testCases = [
		{ type: 'Smoke', objective: 'AutoCompleteRequest test for Ar characters 1', contactIdx: 0 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for Ar characters 2', contactIdx: 0 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for Ar characters 3', contactIdx: 1 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with ar(arabic) character', contactIdx: 1 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n be character', contactIdx: 2 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n ca character', contactIdx: 3 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n bg character', contactIdx: 4 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n de character', contactIdx: 5 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n el character', contactIdx: 6 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n es character', contactIdx: 7 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n fr character', contactIdx: 8 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n hindi character', contactIdx: 9 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n hu character', contactIdx: 10 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n is character', contactIdx: 11 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n iw character', contactIdx: 12 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n ja character', contactIdx: 13 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n ko character', contactIdx: 14 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n nl character', contactIdx: 15 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n pt character', contactIdx: 16 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n ro character', contactIdx: 17 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n ru character', contactIdx: 18 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n sk character', contactIdx: 19 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n sl character', contactIdx: 20 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n sq character', contactIdx: 21 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n sr character', contactIdx: 22 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n srCS character', contactIdx: 23 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n th character', contactIdx: 24 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n uk character', contactIdx: 25 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n vi character', contactIdx: 26 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n zh character', contactIdx: 27 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n hk character', contactIdx: 28 },
		{ type: 'Sanity', objective: 'AutoCompleteRequest test for local contact with i18n tw character', contactIdx: 29 },
	];

	for (const tc of testCases) {
		it(`${tc.type} | ${tc.objective}`, async () => {
			const c = contacts[tc.contactIdx];
			const cId = contactIds[c.id];

			// 5 autocomplete searches per test case (matching XML t:select structure)
			await verifyAutoComplete(c.firstname, cId, 'firstname');
			await verifyAutoComplete(c.partialfirstname, cId, 'partial firstname');
			await verifyAutoComplete(c.partiallastname, cId, 'partial lastname');
			await verifyAutoComplete(c.partialemail, cId, 'partial email');
			await verifyAutoComplete(c.email, cId, 'full email');
		});
	}
});
