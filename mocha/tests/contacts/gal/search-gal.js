import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Search GAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let account2Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">SearchTest User</a>
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

		account2Email = `galtest${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalTest Person</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
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
	it('Sanity | SearchGalRequest basic name search', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest with email address', async () => {
		// GAL sync may take time for newly created accounts
		let cnResult;
		for (let i = 0; i < 5; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${account2Email}</name>
				</SearchGalRequest>`, accountToken
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) {
				cnResult = res.SearchGalResponse.cn;
				break;
			}
			await new Promise(r => setTimeout(r, 2000));
		}
		assert.exists(cnResult, 'Should return at least one match');
		const cn = Array.isArray(cnResult) ? cnResult : [cnResult];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest with domain only', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>@${config.testDomain}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Functional | SearchGalRequest with partial name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>gal</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest case insensitive', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>GALTEST</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest upper case', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>TEST</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Functional | SearchGalRequest with special chars', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test*</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Functional | SearchGalRequest with at sign', async () => {
		// GAL sync may take time for newly created accounts
		let cnResult;
		for (let i = 0; i < 5; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${accountEmail}</name>
				</SearchGalRequest>`, accountToken
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) {
				cnResult = res.SearchGalResponse.cn;
				break;
			}
			await new Promise(r => setTimeout(r, 2000));
		}
		assert.exists(cnResult, 'Should return at least one match');
		const cn = Array.isArray(cnResult) ? cnResult : [cnResult];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Sanity | SearchGalRequest wildcard', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>*</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Functional | SearchGalRequest with limit', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account" limit="1">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return at least one match');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest with nonexistent user', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>nonexistentuser${common.getUniqueString()}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Should not return any matches');
	});


	it('Regression | SearchGalRequest with empty string', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name></name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		if (res.SearchGalResponse.cn) {
			const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
			assert.isAbove(cn.length, 0, 'Should return results for empty string');
		}
	});


	it('Regression | SearchGalRequest with display name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>GalTest Person</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return matches for display name');
	});


	it('Functional | SearchGalRequest with offset', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account" offset="0">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'Should return results with offset');
		const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cn.length, 0, 'Should return results');
	});


	it('Regression | SearchGalRequest with single char', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>g</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		if (res.SearchGalResponse.cn) {
			const cn = Array.isArray(res.SearchGalResponse.cn) ? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
			assert.isAbove(cn.length, 0, 'Should return results for single char');
		}
	});
});
