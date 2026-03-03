import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Skins > Availableskins Get', function () {
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
	it('Smoke | Basic test of GetAvailableSkinsRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get available skins
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAvailableSkinsRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'GetAvailableSkinsRequest should not fault');
	});


	it('Functional | Verify that the skin selected in the cos is displayed for the account', async () => {
		// Create COS with zimbraPrefSkin
		const cosName = `skincos${common.getUniqueString()}`;
		const createCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraPrefSkin">harmony</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(createCosRes.Fault, 'CreateCosRequest should not fault');
		const cosId = createCosRes.CreateCosResponse.cos[0].id;

		// Create account with that COS
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth with prefs request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
				<prefs><pref name="zimbraPrefSkin"/></prefs>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
	});
});
