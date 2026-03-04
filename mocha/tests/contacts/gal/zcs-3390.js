import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > ZCS 3390', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token, account2Email, account2Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `syncgal${common.getUniqueString()}@${config.testDomain}`;
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

		account2Email = `syncgal${common.getUniqueString()}@${config.testDomain}`;
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
		account2Id = acctInfo2.id;
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
	it('Sanity | ZCS-3390 delta sync: deleted account appears in SyncGal then disappears', async () => {
		// Step 1: SyncGal to get initial token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="true"/>`, account1Token
		);
		assert.notExists(syncRes1.Fault, 'SyncGal should not be a Fault');
		assert.exists(syncRes1.SyncGalResponse.token, 'SyncGalResponse token should exist');
		const token1 = syncRes1.SyncGalResponse.token;

		// Step 2: Delete account2
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteAccount should not fault');
		assert.notExists(deleteRes.Fault, 'DeleteAccountResponse should exist');

		// Step 3: Re-auth as account1
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Step 4: SyncGal with previous token — deleted account should appear
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token1}" idOnly="true"/>`, account1Token
		);
		assert.notExists(syncRes2.Fault, 'SyncGal delta should not be a Fault');
		assert.exists(syncRes2.SyncGalResponse.token, 'SyncGalResponse delta token should exist');
		const token2 = syncRes2.SyncGalResponse.token;
		assert.exists(syncRes2.SyncGalResponse.deleted, 'SyncGalResponse deleted should exist');

		// Step 5: SyncGal again with new token — deleted should be empty
		const syncRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token2}" idOnly="true"/>`, account1Token
		);
		assert.notExists(syncRes3.Fault, 'SyncGal final should not be a Fault');
		assert.exists(syncRes3.SyncGalResponse.token, 'SyncGalResponse final token should exist');
	});
});
