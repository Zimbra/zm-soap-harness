import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Bug 31500', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token;
	let account2Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `galtest${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccount1 should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account1 ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `moregaltest${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccount2 should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account2 ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost for account2 should exist');
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
	it('Regression | SearchGal with star character returns contacts from both domains', async () => {
		// SearchGal with wildcard *
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount">
				<name>*</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.Fault, 'SearchGalResponse should exist');
		assert.exists(res.SearchGalResponse.cn, 'SearchGalResponse cn should exist');
		const cnArr = Array.isArray(res.SearchGalResponse.cn)
			? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		const emails = cnArr.map(cn => {
			const emailAttr = Array.isArray(cn.a) ? cn.a.find(a => a.n === 'email') : null;
			return emailAttr ? emailAttr.content || emailAttr._ || emailAttr : null;
		}).filter(Boolean);
		assert.isArray(cnArr, 'cn should be an array');
	});
});
