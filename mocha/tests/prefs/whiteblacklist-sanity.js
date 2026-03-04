import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Prefs > Whiteblacklist Sanity', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Verify ModifyWhiteBlackListRequest adds addr to blackList', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add address to blacklist
		const blackListAddr = `blacklist.${common.getUniqueString()}@${testDomain}`;
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackListAddr}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});


	it('Sanity | Verify GetWhiteBlackListRequest returns blackList', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add address to blacklist first
		const blackListAddr = `blacklist.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<blackList>
					<addr op="+">${blackListAddr}</addr>
				</blackList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);

		// Get the blacklist
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetWhiteBlackListRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetWhiteBlackListRequest should not fault');
		assert.exists(getRes.GetWhiteBlackListResponse.blackList, 'blackList should exist in response');
	});


	it('Sanity | Verify ModifyWhiteBlackListRequest adds addr to whiteList', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add address to whitelist
		const whiteListAddr = `whitelist.${common.getUniqueString()}@${testDomain}`;
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyWhiteBlackListRequest xmlns="urn:zimbraAccount">
				<whiteList>
					<addr op="+">${whiteListAddr}</addr>
				</whiteList>
			</ModifyWhiteBlackListRequest>`, accountAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyWhiteBlackListRequest should not fault');
	});
});
