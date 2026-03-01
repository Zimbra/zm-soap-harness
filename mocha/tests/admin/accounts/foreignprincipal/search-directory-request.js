import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > Foreignprincipal > Search Directory Request', function () {
	let adminAuthToken;
	let domainName, account1Id, account1Fp, account2Id, account2Fp1, account2Fp2;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		domainName = `domain.${common.getUniqueString()}.com`;

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin"><name>${domainName}</name></CreateDomainRequest>`, adminAuthToken
		);

		account1Fp = `test:${common.getUniqueString()}`;
		const acct1Name = `fp.${common.getUniqueString()}@${domainName}`;

		// Create account
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account1Fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Id = (Array.isArray(a1.CreateAccountResponse?.account) ? (Array.isArray(a1.CreateAccountResponse?.account) ? a1.CreateAccountResponse.account[0].id : a1.CreateAccountResponse?.account?.id) : a1.CreateAccountResponse?.account?.id);

		account2Fp1 = `test:${common.getUniqueString()}`;
		account2Fp2 = `test:${common.getUniqueString()}`;
		const acct2Name = `fp.${common.getUniqueString()}@${domainName}`;

		// Create account
		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account2Fp1}</a>
				<a n="zimbraForeignPrincipal">${account2Fp2}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Id = (Array.isArray(a2.CreateAccountResponse?.account) ? (Array.isArray(a2.CreateAccountResponse?.account) ? a2.CreateAccountResponse.account[0].id : a2.CreateAccountResponse?.account?.id) : a2.CreateAccountResponse?.account?.id);
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
	it('Sanity | Search for an account with a foreign principal attribute', async () => {
		// SearchDirectoryRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SearchDirectoryRequest xmlns="urn:zimbraAdmin" domain="${domainName}" attrs="zimbraForeignPrincipal">
				<query>(cn=*)</query>
			</SearchDirectoryRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.SearchDirectoryResponse,
			'SearchDirectoryResponse should exist');

		const accounts = response.SearchDirectoryResponse.account || [];
		const found = accounts.find(a => a.id === account1Id);

		// Verify response
		assert.exists(found, 'Account1 should be in search results');

		const fpAttrs = (found.a || []).filter(a => a.n === 'zimbraForeignPrincipal');
		const fpValues = fpAttrs.map(a => a._content);

		// Verify response
		assert.include(fpValues, account1Fp);
	});


	it('Sanity | Search for an account with two foreign principal attributes', async () => {
		// SearchDirectoryRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<SearchDirectoryRequest xmlns="urn:zimbraAdmin" domain="${domainName}" attrs="zimbraForeignPrincipal">
				<query>(cn=*)</query>
			</SearchDirectoryRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.SearchDirectoryResponse,
			'SearchDirectoryResponse should exist');

		const accounts = response.SearchDirectoryResponse.account || [];
		const found = accounts.find(a => a.id === account2Id);

		// Verify response
		assert.exists(found, 'Account2 should be in search results');

		const fpAttrs = (found.a || []).filter(a => a.n === 'zimbraForeignPrincipal');
		const fpValues = fpAttrs.map(a => a._content);

		// Verify response
		assert.include(fpValues, account2Fp1);
		assert.include(fpValues, account2Fp2);
	});
});
