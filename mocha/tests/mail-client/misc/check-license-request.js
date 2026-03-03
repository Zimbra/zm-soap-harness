import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Misc > Check License Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `license.${uid}a@${config.testDomain}`;
		account2Name = `license.${uid}b@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSMIMEEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
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
	it('Sanity | CheckLicenseRequest for mapi feature - NETWORK', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		// Send check license request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckLicenseRequest xmlns="urn:zimbraAccount" feature="mapi">
			</CheckLicenseRequest>`, acctAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | CheckLicenseRequest for mobileSync feature - NETWORK', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		// Send check license request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckLicenseRequest xmlns="urn:zimbraAccount" feature="mapi">
			</CheckLicenseRequest>`, acctAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | CheckLicenseRequest for smime feature - NETWORK', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account2Name);

		// Send check license request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckLicenseRequest xmlns="urn:zimbraAccount" feature="smime">
			</CheckLicenseRequest>`, acctAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
