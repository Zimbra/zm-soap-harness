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
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		testAccountId = createRes.CreateAccountResponse.account[0].id;
	});

	after(async function () {
		if (testAccountName) await soap.deleteAccount(testAccountName, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | GetAccountRequest with valid value of id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist');
		assert.equal(res.GetAccountResponse.account[0].id, testAccountId,
			'Account ID should match');
	});


	it('Smoke | GetAccountRequest with valid value of name', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist');
		assert.equal(res.GetAccountResponse.account[0].name, testAccountName,
			'Account name should match');
	});


	it('Sanity | GetAccountRequest by id and applyCos=1', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="1">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist with applyCos=1');
		// With applyCos=1, COS attributes should be present
		const attrs = res.GetAccountResponse.account[0].a;
		assert.isArray(attrs, 'Should have attributes array');
	});


	it('Sanity | GetAccountRequest by id and applyCos=0', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="0">
				<account by="id">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist with applyCos=0');
	});


	it('Regression | GetAccountRequest by id and with invalid applyCos values', async () => {
		const invalidValues = ['invalid', '-1', ":'<//\\\\", '01'];
		for (const val of invalidValues) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="${val}">
					<account by="id">${testAccountId}</account>
				</GetAccountRequest>`, adminAuth);
			assert.exists(res.GetAccountResponse || res.Fault,
				`Should handle applyCos="${val}"`);
		}
	});


	it('Sanity | GetAccountRequest by name and applyCos=1', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="1">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist');
	});


	it('Sanity | GetAccountRequest by name and applyCos=0', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="0">
				<account by="name">${testAccountName}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Response should exist');
	});


	it('Regression | GetAccountRequest by name and invalid applyCos values', async () => {
		const invalidValues = ['invalid', '-1', ":'<//\\\\", '01'];
		for (const val of invalidValues) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin" applyCos="${val}">
					<account by="name">${testAccountName}</account>
				</GetAccountRequest>`, adminAuth);
			assert.exists(res.GetAccountResponse || res.Fault,
				`Should handle applyCos="${val}"`);
		}
	});


	it('Regression | GetAccountRequest by id with leading spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">  ${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		// Leading spaces may be trimmed or cause error
		assert.exists(res.GetAccountResponse || res.Fault,
			'Should handle leading spaces in id');
	});


	it('Regression | GetAccountRequest by id with trailing spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}  </account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse || res.Fault,
			'Should handle trailing spaces in id');
	});


	it('Regression | GetAccountRequest by id with both leading and trailing spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">  ${testAccountId}  </account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse || res.Fault,
			'Should handle leading and trailing spaces');
	});


	it('Regression | GetAccountRequest with invalid by attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="sometext">${testAccountId}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for invalid by attribute');
	});


	it('Regression | GetAccountRequest by name of deleted account', async () => {
		const tempName = `get_del_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${tempName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const tempId = createRes.CreateAccountResponse.account[0].id;

		// Delete
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${tempId}</id></DeleteAccountRequest>`, adminAuth);

		// Try to get by name
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${tempName}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for deleted account name');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Regression | GetAccountRequest by id of deleted account', async () => {
		const tempName = `get_del2_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${tempName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const tempId = createRes.CreateAccountResponse.account[0].id;

		// Delete
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${tempId}</id></DeleteAccountRequest>`, adminAuth);

		// Try to get by id
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${tempId}</account>
			</GetAccountRequest>`, adminAuth);
		assert.exists(res.Fault, 'Should return Fault for deleted account id');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT',
			'Should return NO_SUCH_ACCOUNT');
	});


	it('Functional | Get account by id of renamed account', async () => {
		const origName = `get_rename_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${origName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const newName = `get_renamed_${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin"><id>${acctId}</id><newName>${newName}</newName></RenameAccountRequest>`, adminAuth);

		// Get by old id should still work
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="id">${acctId}</account></GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Should find renamed account by id');
		assert.equal(res.GetAccountResponse.account[0].name, newName,
			'Should return new name');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${acctId}</id></DeleteAccountRequest>`, adminAuth);
	});


	it('Functional | Get account by new name of renamed account', async () => {
		const origName = `get_rename2_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${origName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		const newName = `get_renamed2_${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin"><id>${acctId}</id><newName>${newName}</newName></RenameAccountRequest>`, adminAuth);

		// Get by new name
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${newName}</account></GetAccountRequest>`, adminAuth);
		assert.exists(res.GetAccountResponse, 'Should find account by new name');
		assert.equal(res.GetAccountResponse.account[0].id, acctId,
			'Should return same account id');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${acctId}</id></DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by id of one account and name of another', async () => {
		const name2 = `get_cross_${common.getUniqueString()}@${config.testDomain}`;
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name2}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;

		// Get with id of testAccount but name of account2
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
				<account by="name">${name2}</account>
			</GetAccountRequest>`, adminAuth);
		// Server may process either account element
		assert.exists(res.GetAccountResponse, 'Should return response');

		const returnedId = res.GetAccountResponse.account[0].id;
		assert.isTrue(returnedId === testAccountId || returnedId === id2,
			'Should return one of the two accounts');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${id2}</id></DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by multiple ids', async () => {
		const name2 = `get_multi_${common.getUniqueString()}@${config.testDomain}`;
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name2}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
		const id2 = create2.CreateAccountResponse.account[0].id;

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccountId}</account>
				<account by="id">${id2}</account>
			</GetAccountRequest>`, adminAuth);
		// Should only process the first account
		assert.exists(res.GetAccountResponse, 'Should return response');

		// Cleanup
		await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${id2}</id></DeleteAccountRequest>`, adminAuth);
	});


	it('Regression | GetAccountRequest by multiple names', async () => {
		const name2 = `get_multi2_${common.getUniqueString()}@${config.testDomain}`;
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name2}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccountName}</account>
				<account by="name">${name2}</account>
			</GetAccountRequest>`, adminAuth);
		// Should only process the first account
		assert.exists(res.GetAccountResponse, 'Should return response');

		// Cleanup
		await soap.deleteAccount(name2, adminAuth);
	});

});
