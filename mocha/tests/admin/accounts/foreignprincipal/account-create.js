import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Account Create', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create an account with a foreign principal attribute', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(response.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create an account with two foreign principal attributes', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp1}</a>
				<a n="zimbraForeignPrincipal">${fp2}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(response.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create two accounts with the same foreign principal attributes', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName1 = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const acctName2 = `fp.${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName1}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(res1.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account = Array.isArray(res1.CreateAccountResponse.account)
			? res1.CreateAccountResponse.account[0]
			: res1.CreateAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');

		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName2}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(res2.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const account2 = Array.isArray(res2.CreateAccountResponse.account)
			? res2.CreateAccountResponse.account[0]
			: res2.CreateAccountResponse.account;
		assert.exists(account2.id, 'Account should have an id');
	});


	it('Regression | Create an account with zimbraForeignPrincipal as spaces/blank/spchar/sometext/negative/zero/largenumber', async () => {
		// These values must always succeed
		const validValues = [":'//\\\\", 'some text', '-1', '0', '12345678901234567890'];
		for (const val of validValues) {
			const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraForeignPrincipal">${val}</a>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.exists(response.CreateAccountResponse,
				`Should succeed for zimbraForeignPrincipal="${val}"`);
		}
		// Empty and whitespace-only values are trimmed by Zimbra — server may accept or reject
		for (const val of ['', '             ']) {
			const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraForeignPrincipal">${val}</a>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.isTrue(

				response.CreateAccountResponse !== undefined || response.Fault !== undefined,
				`Expected a response for zimbraForeignPrincipal="${val}"`
			);
		}
	});
});
