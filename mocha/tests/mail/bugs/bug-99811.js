import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 99811', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | ModifyPropertiesRequest allows user to write too many properties', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0].id
			: createRes.CreateAccountResponse.account.id;
		const host = accountId.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Set zimbraZimletUserPropertiesMaxNumEntries to 1 via admin
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraZimletUserPropertiesMaxNumEntries">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Try to set more properties than allowed
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPropertiesRequest xmlns="urn:zimbraAccount">
				<prop zimlet="com_zimbra_webex" name="WebExZimlet_today">today</prop>
				<prop zimlet="com_zimbra_webex" name="WebEXZimlet_appendToLocation">true</prop>
			</ModifyPropertiesRequest>`, accountAuthToken
		);

		// Verify the error response
		assert.isString(res.Fault.Detail.Error.Code, 'ModifyPropertiesRequest should fault');
		assert.include(res.Fault.Detail.Error.Code,
			'account.TOO_MANY_ZIMLETUSERPROPERTIES',
			'Error code should be TOO_MANY_ZIMLETUSERPROPERTIES');
	});
});
