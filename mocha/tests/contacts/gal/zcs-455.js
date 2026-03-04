import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > ZCS 455', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Smoke | ZCS-455 SearchGal validation', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'SearchGalResponse cn should exist');
		const cnArr = Array.isArray(res.SearchGalResponse.cn)
			? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cnArr.length, 0, 'Should return at least one contact');
		assert.exists(cnArr[0].id, 'First cn should have id');
		const emailAttr = cnArr[0].a ? (Array.isArray(cnArr[0].a) ? cnArr[0].a : [cnArr[0].a]).find(a => a.n === 'email') : null;
		assert.exists(emailAttr, 'cn should have email attribute');
	});


	it('Sanity | ZCS-455 SearchGal with domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${config.testDomain}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse.cn, 'SearchGalResponse cn should exist');
		const cnArr = Array.isArray(res.SearchGalResponse.cn)
			? res.SearchGalResponse.cn : [res.SearchGalResponse.cn];
		assert.isAbove(cnArr.length, 0, 'Should return at least one contact');
		assert.exists(cnArr[0].id, 'First cn should have id');
	});
});
