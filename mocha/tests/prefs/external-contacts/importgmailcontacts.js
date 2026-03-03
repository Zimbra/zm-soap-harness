import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > External Contacts > Importgmailcontacts', function () {
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
	it('Smoke | Import Gmail contacts from CSV', async () => {
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

		const csvContent = 'Name,Given Name,Family Name,E-mail 1 - Value\nGmail Test,Gmail,Test,gmail@test.com';

		// Import contacts
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(importRes.Fault, 'ImportContactsRequest Gmail should not fault');
	});


	it('Sanity | Import multiple Gmail contacts', async () => {
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

		const csvContent = 'Name,Given Name,Family Name,E-mail 1 - Value\nTest1,First1,Last1,g1@test.com\nTest2,First2,Last2,g2@test.com';

		// Import contacts
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
	});


	it('Functional | Import Gmail contacts and search', async () => {
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

		const uniqueName = `Gmail${common.getUniqueString()}`;
		const csvContent = `Name,Given Name,Family Name,E-mail 1 - Value\n${uniqueName},${uniqueName},Test,${uniqueName}@test.com`;

		// Import contacts
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${uniqueName})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
