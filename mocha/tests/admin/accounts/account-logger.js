import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Logger', function () {
	let adminAuthToken;
	let account1Id, account2Id, account3Id, account4Id;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		const acct1 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct2 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct3 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct4 = `account${common.getUniqueString()}@${config.testDomain}`;

		const r1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const r3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const r4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct4}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const getAcctId = r => {
			const acct = r.CreateAccountResponse?.account;
			return Array.isArray(acct) ? acct[0].id : acct?.id;
		};
		account1Id = getAcctId(r1);
		account2Id = getAcctId(r2);
		account3Id = getAcctId(r3);
		account4Id = getAcctId(r4);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Sanity test for AddAccountLoggerRequest', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AddAccountLoggerResponse,
			'AddAccountLoggerResponse should exist');
		assert.exists(response.AddAccountLoggerResponse.logger,
			'Logger should exist in response');
	});


	it('Sanity | Sanity test for RemoveAccountLoggerRequest', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</RemoveAccountLoggerRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.RemoveAccountLoggerResponse,
			'RemoveAccountLoggerResponse should exist');
	});


	it('Sanity | Sanity test for GetAccountLoggersRequest', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountLoggersRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</GetAccountLoggersRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountLoggersResponse,
			'GetAccountLoggersResponse should exist');
		assert.exists(response.GetAccountLoggersResponse.logger,
			'Logger should exist in response');
	});


	it('Sanity | Sanity test for GetAllAccountLoggersRequest', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllAccountLoggersRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAllAccountLoggersResponse,
			'GetAllAccountLoggersResponse should exist');
		assert.exists(response.GetAllAccountLoggersResponse.accountLogger,
			'accountLogger should exist');
	});
});
