import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Pref Get', function () {
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
	it('Smoke | Verify that GetPrefsRequest receives a response (default request)', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send GetPrefsRequest without preference element
		const getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');
		assert.exists(getPrefsRes.GetPrefsResponse, 'GetPrefsResponse should exist');
	});


	it('Sanity | Verify that GetPrefsRequest can specify a preference element', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const validPrefName = 'zimbraPrefSaveToSent';
		const validPrefValue = 'TRUE';

		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send GetPrefsRequest with a preference element
		const getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="${validPrefName}"/>
			</GetPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');
		assert.exists(getPrefsRes.GetPrefsResponse, 'GetPrefsResponse should exist');

		const responseAttrs = getPrefsRes.GetPrefsResponse._attrs;
		assert.exists(responseAttrs, 'GetPrefsResponse _attrs should exist');
		assert.exists(responseAttrs[validPrefName], `Preference ${validPrefName} should exist`);
		assert.equal(String(responseAttrs[validPrefName]).toUpperCase(), validPrefValue.toUpperCase(), 'Preference value should match');
	});
});
