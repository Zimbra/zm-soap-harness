import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Bugs > Bug 48742 - Japanese i18n contact search', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);

		const lastNames = ['いちご', 'イチゴ', 'ｲﾁｺﾞ', '全角ひらがな', '全角カタカナ', '半角',
			'あああいちごいいい', 'いちごいいい', 'あああいちご',
			'アアアイチゴイイイ', 'イチゴイイイ', 'アアアイチゴ',
			'ｱｱｱｲﾁｺﾞｲｲｲ', 'ｲﾁｺﾞｲｲｲ', 'ｱｱｱｲﾁｺﾞ'];

		for (let i = 0; i < lastNames.length; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">Fname${i + 1}</a>
						<a n="lastName">${lastNames[i]}</a>
						<a n="email">email${i + 1}.${common.getUniqueString()}@domain.com</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Search contacts with hiragana いちご', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="20">
				<query>いちご</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Search contacts with katakana イチゴ', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="20">
				<query>イチゴ</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Search contacts with half-width katakana ｲﾁｺﾞ', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="20">
				<query>ｲﾁｺﾞ</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Search contacts with full-width hiragana embedded', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="20">
				<query>全角ひらがな</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
