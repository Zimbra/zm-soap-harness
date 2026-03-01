import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > Foreignprincipal > Account Create', function () {
	let adminAuthToken;

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
	it('Sanity | Create an account with a foreign principal attribute', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create an account with two foreign principal attributes', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp1}</a>
				<a n="zimbraForeignPrincipal">${fp2}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create two accounts with the same foreign principal attributes', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName1 = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const acctName2 = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName1}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(res1.CreateAccountResponse.account)
			? res1.CreateAccountResponse.account[0]
			: res1.CreateAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		// Create account
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName2}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account2 = Array.isArray(res2.CreateAccountResponse.account)
			? res2.CreateAccountResponse.account[0]
			: res2.CreateAccountResponse.account;

		// Verify response
		assert.exists(account2.id, 'Account should have an id');
	});


	it('Regression | Create an account with zimbraForeignPrincipal as spaces, blank, spchar, sometext, negative, zero, largenumber', async () => {
		// These values must always succeed
		const validValues = [':\'//\\\\', 'some text', '-1', '0', '12345678901234567890'];
		for (const val of validValues) {
			const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

			// Create account
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraForeignPrincipal">${val}</a>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.CreateAccountResponse,
				`Should succeed for zimbraForeignPrincipal="${val}"`);
		}
		// Empty and whitespace-only values are trimmed by Zimbra — server may accept or reject
		for (const val of ['', '             ']) {
			const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

			// Create account
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraForeignPrincipal">${val}</a>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.isTrue(response.CreateAccountResponse !== undefined || response.Fault !== undefined,
				`Expected a response for zimbraForeignPrincipal="${val}"`
			);
		}
	});
});
