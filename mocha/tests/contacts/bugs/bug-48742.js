import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 48742', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;
	const contactIds = [];
	const lastNames = ['いちご', 'イチゴ', 'ｲﾁｺﾞ', '全角ひらがな', '全角カタカナ', '半角',
		'あああいちごいいい', 'いちごいいい', 'あああいちご',
		'アアアイチゴイイイ', 'イチゴイイイ', 'アアアイチゴ',
		'ｱｱｱｲﾁｺﾞｲｲｲ', 'ｲﾁｺﾞｲｲｲ', 'ｱｱｱｲﾁｺﾞ'];

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
		accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create 15 contacts with Japanese names
		for (let i = 0; i < lastNames.length; i++) {
			const createRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">Fname${i + 1}</a>
						<a n="lastName">${lastNames[i]}</a>
						<a n="email">email${i + 1}.${common.getUniqueString()}@domain.com</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
			assert.notExists(createRes.Fault, `CreateContact ${i + 1} should not fault`);
			const cn = Array.isArray(createRes.CreateContactResponse.cn)
				? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
			assert.exists(cn.id, `Contact ${i + 1} id should exist`);
			contactIds.push(cn.id);
		}

		// Wait for search indexing to complete
		await new Promise(resolve => setTimeout(resolve, 3000));
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

	// Helper: extract firstNames from search results
	function getFirstNames(searchRes) {
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse should have cn contacts');
		const contacts = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		return contacts.map(cn => {
			if (cn._attrs && cn._attrs.firstName) return cn._attrs.firstName;
			const attrs = Array.isArray(cn.a) ? cn.a : (cn.a ? [cn.a] : []);
			const fn = attrs.find(a => a.n === 'firstName');
			return fn ? fn._content : '';
		});
	}

	// Tests
	it('Sanity | Search contacts using and all the 15 contacts should be displayed 1', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="100">
				<query>いちご</query>
			</SearchRequest>`, accountToken
		);
		const firstNames = getFirstNames(searchRes);
		assert.isTrue(firstNames.some(fn => fn.includes('Fname1')),
			'Search results for いちご should contain Fname1');
	});


	it('Sanity | Search contacts using and all the 15 contacts should be displayed 2', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="100">
				<query>イチゴ</query>
			</SearchRequest>`, accountToken
		);
		const firstNames = getFirstNames(searchRes);
		assert.isTrue(firstNames.some(fn => fn.includes('Fname1')),
			'Search results for イチゴ should contain Fname1');
	});


	it('Sanity | Search contacts using and all the 15 contacts should be displayed 3', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="100">
				<query>ｲﾁｺﾞ</query>
			</SearchRequest>`, accountToken
		);
		const firstNames = getFirstNames(searchRes);
		assert.isTrue(firstNames.some(fn => fn.includes('Fname1')),
			'Search results for ｲﾁｺﾞ should contain Fname1');
	});


	it('Sanity | RFE - Find contacts by partial matches', async () => {
		// Additional verification for nameSuffix partial match contacts (contacts 4,5,6)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" limit="100">
				<query>全角ひらがな</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse should have cn contacts');
		const contacts = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		const firstNames = contacts.map(cn => {
			if (cn._attrs && cn._attrs.firstName) return cn._attrs.firstName;
			const attrs = Array.isArray(cn.a) ? cn.a : (cn.a ? [cn.a] : []);
			const fn = attrs.find(a => a.n === 'firstName');
			return fn ? fn._content : '';
		});
		assert.isTrue(firstNames.some(fn => fn.includes('Fname4')),
			'Search results for 全角ひらがな should contain Fname4');
	});
});
