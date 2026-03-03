import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mobile > Get Device Status Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `test${uid}@${config.testDomain}`;

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(res.CreateAccountResponse?.account)
			? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		account1Id = acct?.id;

		// Enable mobile sync feature on the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraFeatureMobileSyncEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
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
	it.skip('Sanity | Verify basic GetDeviceStatusRequest', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetDeviceStatusRequest xmlns="urn:zimbraSync"/>', acctAuthToken
		);
		assert.notExists(res.Fault, 'GetDeviceStatusRequest should not fault');
	});
});
