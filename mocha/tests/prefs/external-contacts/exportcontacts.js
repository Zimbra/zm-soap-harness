import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ExportContacts', function () {
	this.timeout(120 * 1000);
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
	it('Smoke | Export contacts as CSV', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Export${common.getUniqueString()}</a>
					<a n="lastName">Test</a>
					<a n="email">export.test@example.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify the response
		assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountAuthToken
		);

		// Verify the response
		assert.notExists(exportRes.Fault, 'ExportContactsRequest should not fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Sanity | Export contacts with thunderbird format', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Thunder${common.getUniqueString()}</a>
					<a n="lastName">Bird</a>
					<a n="email">tb@test.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="thunderbird-csv"/>`, accountAuthToken
		);

		// Verify the response
		assert.exists(exportRes.Fault, 'ExportContactsRequest thunderbird-csv format should fault as unsupported');
	});


	it('Sanity | Export contacts with outlook format', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Out${common.getUniqueString()}</a>
					<a n="lastName">Look</a>
					<a n="email">ol@test.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="outlook-2003-csv"/>`, accountAuthToken
		);

		// Verify the response
		assert.exists(exportRes.Fault, 'ExportContactsRequest outlook-2003-csv format should fault as unsupported');
	});


	it('Sanity | Export contacts with yahoo format', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Ya${common.getUniqueString()}</a>
					<a n="lastName">Hoo</a>
					<a n="email">yh@test.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="yahoo-csv"/>`, accountAuthToken
		);

		// Verify the response
		assert.exists(exportRes.Fault, 'ExportContactsRequest yahoo-csv format should fault as unsupported');
	});


	it('Functional | Export empty contacts', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountAuthToken
		);

		// Verify the response
		assert.notExists(exportRes.Fault, 'Export empty contacts should not fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Functional | Export contacts with invalid format', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="invalid-format"/>`, accountAuthToken
		);

		// Verify the response
		assert.exists(exportRes.Fault, 'Export with invalid format should fault');
	});
});
