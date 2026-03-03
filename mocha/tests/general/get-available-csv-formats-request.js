import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Get Available Csv Formats Request', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `acc${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | GetSpellDictionariesRequest', async () => {
		// GetAvailableCsvFormatsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAvailableCsvFormatsRequest xmlns="urn:zimbraAccount">
			</GetAvailableCsvFormatsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const csvFormats = Array.isArray(res.GetAvailableCsvFormatsResponse.csv)
			? res.GetAvailableCsvFormatsResponse.csv
			: [res.GetAvailableCsvFormatsResponse.csv];
		const formatNames = csvFormats.map(f => f.name);

		// Verify response
		assert.include(formatNames, 'windows-live-mail-csv',
			'Should contain windows-live-mail-csv format');
		assert.include(formatNames, 'zimbra-csv',
			'Should contain zimbra-csv format');
		assert.include(formatNames, 'yahoo-csv',
			'Should contain yahoo-csv format');
		assert.include(formatNames, 'thunderbird-csv',
			'Should contain thunderbird-csv format');
		assert.include(formatNames, 'outlook-2003-csv',
			'Should contain outlook-2003-csv format');
	});
});
