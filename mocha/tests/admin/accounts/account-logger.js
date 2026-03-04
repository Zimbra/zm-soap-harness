import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Logger', function () {
	let adminAuthToken;
	let account1Id, account2Id, account3Id, account4Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const acct1 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct2 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct3 = `account${common.getUniqueString()}@${config.testDomain}`;
		const acct4 = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const r1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		const r3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
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
		const host1 = r1.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'zimbraMailHost should exist');
		account2Id = getAcctId(r2);
		const host2 = r2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account3Id = getAcctId(r3);
		const host3 = r3.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
		account4Id = getAcctId(r4);
		const host4 = r4.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'zimbraMailHost should exist');
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
	it('Sanity | Sanity test for AddAccountLoggerRequest', async () => {
		// AddAccountLoggerRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AddAccountLoggerResponse.logger,
			'Logger should exist in response');
	});


	it('Sanity | Sanity test for RemoveAccountLoggerRequest', async () => {
		// AddAccountLoggerRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		// RemoveAccountLoggerRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</RemoveAccountLoggerRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sanity test for GetAccountLoggersRequest', async () => {
		// AddAccountLoggerRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		// GetAccountLoggersRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountLoggersRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</GetAccountLoggersRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountLoggersResponse.logger,
			'Logger should exist in response');
	});


	it('Sanity | Sanity test for GetAllAccountLoggersRequest', async () => {
		// AddAccountLoggerRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountLoggerRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
				<logger category="zimbra.soap" level="debug"/>
			</AddAccountLoggerRequest>`, adminAuthToken
		);

		// GetAllAccountLoggersRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllAccountLoggersRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAllAccountLoggersResponse.accountLogger,
			'accountLogger should exist');
	});
});
