import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ImportZimbraContacts', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Smoke | Import Zimbra contacts from CSV', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email"\n"Zimbra","Test","zimbra@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest Zimbra should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import Zimbra contacts with multiple fields', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email","company","jobTitle"\n"Full","Fields","full@test.com","TestCo","Engineer"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import Zimbra contacts with phone numbers', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email","workPhone"\n"Phone","Test","phone@test.com","555-0100"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import Zimbra contacts with address', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email","homeStreet","homeCity"\n"Addr","Test","addr@test.com","123 Main St","Testville"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import and then export Zimbra contacts', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Import
		const csvContent = '"firstName","lastName","email"\n"RoundTrip","Test","roundtrip@test.com"';
		await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);

		// Export
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountAuthToken
		);
		assert.notExists(exportRes.Fault, 'ExportContactsRequest should not fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Functional | Import Zimbra contacts and search by name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const uniqueName = `Zimb${common.getUniqueString()}`;
		const csvContent = `"firstName","lastName","email"\n"${uniqueName}","SearchMe","${uniqueName}@test.com"`;
		await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${uniqueName})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Import large batch of Zimbra contacts', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		let csvContent = '"firstName","lastName","email"';
		for (let i = 1; i <= 5; i++) {
			csvContent += `\n"Batch${i}","Large","batch${i}@test.com"`;
		}
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest large batch should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import Zimbra contacts with notes', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email","notes"\n"Notes","Test","notes@test.com","This is a test note"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest with notes should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import Zimbra contacts into Contacts folder', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email"\n"Folder","Specific","fs@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv" l="7">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest to folder should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});
});
