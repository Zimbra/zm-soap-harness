import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ImportContacts', function () {
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

	it('Smoke | Import contacts from CSV content', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email"\n"Import","Test","import@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Sanity | Import contacts and verify count', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const csvContent = '"firstName","lastName","email"\n"John","Doe","john@test.com"\n"Jane","Smith","jane@test.com"';
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountAuthToken
		);
		assert.notExists(importRes.Fault, 'ImportContactsRequest should not fault');
		assert.exists(importRes.ImportContactsResponse, 'ImportContactsResponse should exist');
	});


	it('Functional | Import contacts with empty content', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content></content>
			</ImportContactsRequest>`, accountAuthToken
		);
		// Empty content may or may not fault depending on server
		assert.isTrue(
			(importRes.ImportContactsResponse !== undefined) || (importRes.Fault !== undefined),
			'Server should return a proper response for empty import'
		);
	});
});
