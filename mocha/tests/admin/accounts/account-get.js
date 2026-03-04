import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Get', function () {
	let adminAuth;
	let testAccountName, testAccountId;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();

		testAccountName = `get_acct_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		testAccountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	});

	after(async function () {
		if (testAccountName) await soap.deleteAccount(testAccountName, adminAuth);
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
	it('Smoke | GetAccountRequest with valid value of id', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		assert.equal(res.GetAccountResponse.account[0].id, testAccountId,
			'Account ID should match');
	});


	it('Smoke | GetAccountRequest with valid value of name', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		assert.equal(res.GetAccountResponse.account[0].name, testAccountName,
			'Account name should match');
	});


	it('Sanity | GetAccountRequest by id and applyCos 1', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="1">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// With applyCos=1, COS attributes should be present
		const attrs = res.GetAccountResponse.account[0].a;

		// Verify response
		assert.isArray(attrs, 'Should have attributes array');
	});


	it('Sanity | GetAccountRequest by id and applyCos 0', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="0">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | GetAccountRequest by id and with value of applyCos as invalid, negative, char, spchar, startingwithzero', async () => {
		const invalidValues = ['invalid', '-1', '@#$%^', '01'];
		for (const val of invalidValues) {

			// GetAccountRequest
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="${val}">
					<account by="id">${testAccountId}</account>
				</GetAccountRequest>`, adminAuth);

			// Verify response
			assert.notExists(res.Fault, `Should not fault for applyCos="${val}"`);
			assert.exists(res.GetAccountResponse.account[0].id,
				`Account id should exist for applyCos="${val}"`);
		}
	});


	it('Sanity | GetAccountRequest by name and value of applyCos 1', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="1">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | GetAccountRequest by name and value of applyCos 0', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="0">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | GetAccountRequest by name and value of cos as invalid, negative, char, spchar, startingwithzero', async () => {
		const invalidValues = ['invalid', '-1', '@#$%^', '01'];
		for (const val of invalidValues) {

			// GetAccountRequest
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="${val}">
					<account by="name">${testAccountName}</account>
				</GetAccountRequest>`, adminAuth);

			// Verify response
			assert.notExists(res.Fault, `Should not fault for applyCos="${val}"`);
			assert.exists(res.GetAccountResponse.account[0].id,
				`Account id should exist for applyCos="${val}"`);
		}
	});


	it('Regression | GetAccountRequest by id, name and with leading spaces in id, name', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">  ${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		// Leading spaces may be trimmed or cause error
		// Verify response
		assert.notExists(res.Fault, 'Should not fault for leading spaces');
		assert.exists(res.GetAccountResponse.account[0].id,
			'Account id should exist');
	});


	it('Regression | GetAccountRequest by id, name and with trailing spaces in id, name', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}  </account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault for trailing spaces');
		assert.exists(res.GetAccountResponse.account[0].id,
			'Account id should exist');
	});


	it('Regression | GetAccountRequest by id, name and with both leading and trailing spaces in id, name', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">  ${testAccountId}  </account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault for leading and trailing spaces');
		assert.exists(res.GetAccountResponse.account[0].id,
			'Account id should exist');
	});


	it('Regression | GetAccountRequest with value of atrribute by as sometext (ie invalid)', async () => {
		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="sometext">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for invalid by attribute');
	});


	it('Regression | GetAccountRequest by name of deleted account', async () => {
		const tempName = `get_del_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const tempId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Delete
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${tempId}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Try to get by name
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${tempName}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for deleted account name');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Regression | Get account by name of deleted account', async () => {
		const tempName = `get_del2_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const tempId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Delete
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${tempId}</id>
			</DeleteAccountRequest>`, adminAuth);

		// Try to get by id
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${tempId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return Fault for deleted account id');

		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Functional | Get account by id of old account', async () => {
		const origName = `get_rename_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${origName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const acctId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const newName = `get_renamed_${common.getUniqueString()}@${config.testDomain}`;

		// RenameAccountRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuth);

		// Get by old id should still work
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		assert.equal(res.GetAccountResponse.account[0].name, newName,
			'Should return new name');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuth);
	});


	it('Functional | Get account by giving the New name of the renamed account', async () => {
		const origName = `get_rename2_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${origName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const acctId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const newName = `get_renamed2_${common.getUniqueString()}@${config.testDomain}`;

		// RenameAccountRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuth);

		// Get by new name
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${newName}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		assert.equal(res.GetAccountResponse.account[0].id, acctId,
			'Should return same account id');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
			</DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by id of one account and name of the other account', async () => {
		const name2 = `get_cross_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;
		const host = create2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Get with id of testAccount but name of account2
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
				<account by="name">${name2}</account>
			</GetAccountRequest>`, adminAuth);
		// Server may process either account element
		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		const returnedId = res.GetAccountResponse.account[0].id;

		// Verify response
		assert.isTrue(returnedId === testAccountId || returnedId === id2,
			'Should return one of the two accounts');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${id2}</id>
			</DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by multiple ids', async () => {
		const name2 = `get_multi_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;
		const host = create2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
				<account by="id">${id2}</account>
			</GetAccountRequest>`, adminAuth);
		// Should only process the first account
		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${id2}</id>
			</DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by multiple names', async () => {
		const name2 = `get_multi2_${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// GetAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccountName}</account>
				<account by="name">${name2}</account>
			</GetAccountRequest>`, adminAuth);
		// Should only process the first account
		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');

		// Cleanup
		await soap.deleteAccount(name2, adminAuth);
	});
});
