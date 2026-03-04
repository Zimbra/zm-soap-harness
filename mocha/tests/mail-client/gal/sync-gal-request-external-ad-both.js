import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > GAL > Sync GAL Request External Ad Both', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `gal.${uid}a@${config.testDomain}`;
		account2Name = `gal.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
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
		}
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
	it('Functional | SyncGalRequest against both internal and external (AD) servers should return accounts and resources', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
