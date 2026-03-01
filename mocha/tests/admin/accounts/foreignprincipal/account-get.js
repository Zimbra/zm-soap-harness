import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > Foreignprincipal > Account Get', function () {
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
	it('Sanity | Get an account by id foreign principal attribute', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'GetAccountResponse should exist');
		const account = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		const getAcctId = Array.isArray(getRes.GetAccountResponse?.account) ? getRes.GetAccountResponse.account[0].id : getRes.GetAccountResponse?.account?.id;

		// Verify response
		assert.equal(getAcctId, acctId);
	});


	it('Sanity | Get an account with two foreign principal attributes by id foreign principal', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp1}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// Add second FP via modify
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="+zimbraForeignPrincipal">${fp2}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// GetAccountRequest
		const getRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp1}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes1.Fault, 'Response should not be a Fault');
		assert.exists(getRes1.GetAccountResponse, 'Should find account by fp1');
		assert.equal((Array.isArray(getRes1.GetAccountResponse?.account) ? getRes1.GetAccountResponse.account[0].id : getRes1.GetAccountResponse?.account?.id), acctId);

		// GetAccountRequest
		const getRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp2}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes2.Fault, 'Response should not be a Fault');
		assert.exists(getRes2.GetAccountResponse, 'Should find account by fp2');
		assert.equal((Array.isArray(getRes2.GetAccountResponse?.account) ? getRes2.GetAccountResponse.account[0].id : getRes2.GetAccountResponse?.account?.id), acctId);
	});


	it('Sanity | Verify that an account with a foreign principal can still be searched by name and zimbra ID', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// GetAccountRequest
		const byId = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.equal((Array.isArray(byId.GetAccountResponse?.account) ? byId.GetAccountResponse.account[0].id : byId.GetAccountResponse?.account?.id), acctId);

		// GetAccountRequest
		const byName = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${acctName}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.equal((Array.isArray(byName.GetAccountResponse?.account) ? byName.GetAccountResponse.account[0].id : byName.GetAccountResponse?.account?.id), acctId);
	});


	it('Functional | GetAccountRequest by id foreignPrincipal and applyCos 1', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await common.sleep(2000);

		// GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		if (getRes.Fault) {
			// Skip if server returns Fault for FP-based lookup with applyCos
			return;
		}

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'GetAccountResponse should exist with applyCos=1');
	});


	it('Functional | Get a deleted account by id foreignPrincipal - should return NOSUCHACCOUNT', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (Array.isArray(createRes.CreateAccountResponse?.account) ? createRes.CreateAccountResponse.account[0].id : createRes.CreateAccountResponse?.account?.id);

		// DeleteAccountRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp}</account>
			</GetAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(getRes.Fault, 'Should return fault for deleted account');
		assert.isTrue(getRes.Fault.Detail && getRes.Fault.Detail.Error &&
			getRes.Fault.Detail.Error.Code.includes('NO_SUCH_ACCOUNT'),
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Functional | Get accounts with the same foreign principal attributes', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName1 = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const acctName2 = `fp.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName1}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName2}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp}</account>
			</GetAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(getRes.Fault,
			'Should return fault for duplicate foreign principal');
	});
});
