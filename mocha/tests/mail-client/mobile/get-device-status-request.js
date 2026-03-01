import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Mobile > GetDeviceStatusRequest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	const uid = common.getUniqueString();

	before(async function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify basic GetDeviceStatusRequest', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetDeviceStatusRequest xmlns="urn:zimbraSync"/>', acctAuthToken
		);
		assert.notExists(res.Fault, 'GetDeviceStatusRequest should not fault');
		assert.exists(res.GetDeviceStatusResponse, 'GetDeviceStatusResponse should exist');
	});
});
