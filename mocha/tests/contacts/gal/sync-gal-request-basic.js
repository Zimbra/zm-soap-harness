import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Sync GAL Request Basic', function () {
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
	it('Smoke | SyncGalRequest basic sync', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse.token, 'SyncGalResponse token should exist');
	});


	it('Sanity | SyncGalRequest with token from initial sync', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(res1.Fault, 'Initial SyncGal should not fault');
		const token = res1.SyncGalResponse.token;
		assert.exists(token, 'Initial SyncGalResponse token should exist');
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}"/>`, accountToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'SyncGal with token should not fault');
		assert.exists(res2.SyncGalResponse.token, 'SyncGalResponse token should exist');
	});


	it('Sanity | SyncGalRequest returns more field', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse.token, 'SyncGalResponse token should exist');
		if (res.SyncGalResponse.cn) {
			const cnArr = Array.isArray(res.SyncGalResponse.cn) ? res.SyncGalResponse.cn : [res.SyncGalResponse.cn];
			assert.isAbove(cnArr.length, 0, 'Should have at least one cn entry');
		}
	});
});
