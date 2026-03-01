import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ImportYahooContacts', function () {
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

	it('Smoke | Import Yahoo contacts from CSV', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"First","Last","Email"\n"Yahoo","Test","yahoo@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest Yahoo should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import multiple Yahoo contacts', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"First","Last","Email"\n"Y1","Test1","y1@test.com"\n"Y2","Test2","y2@test.com"\n"Y3","Test3","y3@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import Yahoo contacts with special characters', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"First","Last","Email"\n"Special-Name","O\'Brien","special@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest special chars should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import Yahoo contacts and search', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const uniqueName = `Yahoo${common.getUniqueString()}`;
		const csvContent = `"First","Last","Email"\n"${uniqueName}","Search","${uniqueName}@test.com"`;
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${uniqueName})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Import Yahoo contacts into specific folder', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"First","Last","Email"\n"Folder","Test","folder@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv" l="7">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest to folder should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import Yahoo contacts with duplicate entries', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"First","Last","Email"\n"Dup","Test","dup@test.com"\n"Dup","Test","dup@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest duplicates should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});
});
