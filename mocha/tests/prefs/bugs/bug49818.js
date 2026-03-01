import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > Bug49818', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Bug49818 Unidentified characters in notification message', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const notifAddr = `notif.${common.getUniqueString()}@${testDomain}`;

		// Modify preferences
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyPrefsRequest xmlns="urn:zimbraAccount"><pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref><pref name="zimbraPrefNewMailNotificationAddress">${notifAddr}</pref></ModifyPrefsRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});
});
