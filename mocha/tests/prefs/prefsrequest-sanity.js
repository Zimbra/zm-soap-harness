import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('PrefsRequest Sanity', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify ModifyPrefsRequest sends response', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send ModifyPrefsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSaveToSent">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Smoke | Verify GetPrefsRequest sends response', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send GetPrefsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'GetPrefsRequest should not fault');
		assert.exists(res.GetPrefsResponse, 'GetPrefsResponse should exist');
	});
});
