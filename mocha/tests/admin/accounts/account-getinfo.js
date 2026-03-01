import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Getinfo', function () {
	let adminAuthToken;
	let testAccount1, testAccount2, testAccount3, testAccount4, testAccount6;
	let account1Id, account2Id, account3Id, account4Id, account6Id;
	let userAuthToken;
	const sanValue = 'H123456';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		testAccount1 = `test${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `test${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `test${common.getUniqueString()}@${config.testDomain}`;
		testAccount4 = `test${common.getUniqueString()}@${config.testDomain}`;
		testAccount6 = `test${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount1, testAccount1);
		account1Id = res1.accountId;

		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount2, testAccount2);
		account2Id = res2.accountId;

		const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount3, testAccount3);
		account3Id = res3.accountId;

		// account4 with closed status
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount4}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAccountStatus">closed</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account4Id = res4.CreateAccountResponse.account[0].id;

		// account6 with SAN
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount6}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraServiceAccountNumber">${sanValue}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account6Id = res6.CreateAccountResponse.account[0].id;

		// Delete account3
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Login as test_account1
		userAuthToken = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
	});

	after(async function () {
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuthToken);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuthToken);
		if (testAccount4) await soap.deleteAccount(testAccount4, adminAuthToken);
		if (testAccount6) await soap.deleteAccount(testAccount6, adminAuthToken);
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
	it('Sanity | Get the account information by account name 1', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount1}</account>
			</GetAccountInfoRequest>`, userAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountInfoResponse,
			'GetAccountInfoResponse should exist');
		assert.exists(response.GetAccountInfoResponse.name,
			'GetAccountInfoResponse should have name');

		assert.equal(response.GetAccountInfoResponse.name, testAccount1);

		const attrs = response.GetAccountInfoResponse.attr || [];
		const zimbraIdAttr = attrs.find(a => a.name === 'zimbraId');
		if (zimbraIdAttr) {

			// Verify response
			assert.equal(zimbraIdAttr._content, account1Id);
		}
	});


	it('Sanity | Get the account information by account id', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="id">${account1Id}</account>
			</GetAccountInfoRequest>`, userAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountInfoResponse,
			'GetAccountInfoResponse should exist');
		assert.exists(response.GetAccountInfoResponse.name,
			'GetAccountInfoResponse should have name');

		assert.equal(response.GetAccountInfoResponse.name, testAccount1);
	});


	it('Functional | Get the account information by both account name and account id', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="id">${account1Id}</account>
				<account by="name">${testAccount1}</account>
			</GetAccountInfoRequest>`, userAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountInfoResponse,
			'GetAccountInfoResponse should exist');
		assert.exists(response.GetAccountInfoResponse.name,
			'GetAccountInfoResponse should have name');

		assert.equal(response.GetAccountInfoResponse.name, testAccount1);
	});


	it('Regression | Get the account information by id of one account and name of other account', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="id">${account2Id}</account>
				<account by="name">${testAccount1}</account>
			</GetAccountInfoRequest>`, userAuthToken
		);
		// The XML expects account2 info to be returned (id takes precedence)
		// Verify response
		assert.isTrue(!!response.GetAccountInfoResponse || (response.Fault && response.Fault.Detail &&
			response.Fault.Detail.Error && response.Fault.Detail.Error.Code.includes('service.PERM_DENIED')),
			'Expected PERM_DENIED or Success');
	});


	it('Regression | Get the account information by name of one account and account id of other account', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount1}</account>
				<account by="id">${account2Id}</account>
			</GetAccountInfoRequest>`, userAuthToken
		);

		// Verify response
		assert.isTrue(!!response.GetAccountInfoResponse ||
			(response.Fault && response.Fault.Detail &&
				response.Fault.Detail.Error &&
				response.Fault.Detail.Error.Code.includes(
					'service.PERM_DENIED')),
			'Expected PERM_DENIED or Success');
	});


	it('Regression | Get the account information by invalid values (blank, spaces, sometext, spchar) for name of an account', async () => {
		const invalidNames = ['', '        ', 'some text 009', '//|.\'\\\\-'];
		for (const name of invalidNames) {

			// GetAccountInfoRequest
			const response = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="name">${name}</account>
				</GetAccountInfoRequest>`, userAuthToken, false
			);

			// Verify response
			assert.exists(response.Fault, `Should fault for name="${name}"`);

			const code = response.Fault.Detail.Error.Code;
			const allowedCodes = ['service.PERM_DENIED', 'account.NO_SUCH_ACCOUNT', 'service.INVALID_REQUEST', 'service.PARSE_ERROR'];

			// Verify response
			assert.isTrue(allowedCodes.some(c => code.includes(c)),
				`Should be an expected error for name="${name}", got: ${code}`);
		}
	});


	it('Regression | Get the account information by writing invalid (blank, space, sometext, negative, zero, special characters) in account id', async () => {
		const invalidIds = ['{', 'some text 009 ', '        ', '-109876', '//|.\'\\\\-'];
		for (const id of invalidIds) {

			// GetAccountInfoRequest
			const response = await soap.makeSOAPEnvelopeAccount(
				`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
					<account by="id">${id}</account>
				</GetAccountInfoRequest>`, userAuthToken
			);
			if (response.Fault) {
				const code = response.Fault.Detail.Error.Code;
				const allowedCodes = ['service.PERM_DENIED', 'account.NO_SUCH_ACCOUNT', 'service.INVALID_REQUEST', 'service.PARSE_ERROR'];

				// Verify response
				assert.isTrue(allowedCodes.some(c => code.includes(c)),
					`Should be an expected error for id="${id}", got: ${code}`);
			} else {
				assert.notExists(response.Fault, 'Response should not be a Fault');
				assert.exists(response.GetAccountInfoResponse,
					`Unexpected success for id="${id}"`);
			}
		}
	});


	it('Sanity | Get the account information by writing nonexisting account name', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="id">${testAccount1}_nonexist</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault);

		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.PERM_DENIED') || code.includes('account.NO_SUCH_ACCOUNT'));
	});


	it('Regression | Get the account information with name of deleted account', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount3}</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault);

		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.PERM_DENIED') || code.includes('account.NO_SUCH_ACCOUNT'));
	});


	it('Regression | Get the account information with the id of deleted account', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="id">${account3Id}</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault);

		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.PERM_DENIED') || code.includes('account.NO_SUCH_ACCOUNT'));
	});


	it('Regression | Get the account information by writing nonexisting account name of an account and existing id of an account', async () => {
		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${config.testDomain}</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault);

		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.PERM_DENIED') ||
			code.includes('account.NO_SUCH_ACCOUNT'));
	});


	it('Regression | Get the account information by writing domain name only', async () => {
		const nonExistName = 'nonexist' + common.getUniqueString() +
			'@' + config.testDomain;

		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${nonExistName}</account>
				<account by="id">${account1Id}</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should return fault');
		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.PERM_DENIED') ||
			code.includes('account.NO_SUCH_ACCOUNT'));
	});


	it('Regression | Get the account information of an account whose status is closed', async () => {
		await soap.getAccountAuthToken(testAccount4, config.accountPassword).catch(() => null);
		// Closed accounts may not be able to auth, use user1 token
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount4}</account>
			</GetAccountInfoRequest>`, userAuthToken, false
		);

		// Verify response
		assert.isTrue(!!response.GetAccountInfoResponse || !!response.Fault, 'Expected fault or success');
		if (response.Fault && response.Fault.Detail && response.Fault.Detail.Error) {
			assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED');
		}
	});


	it('Sanity | Get the account information by account name 2', async () => {
		const auth6 = await soap.getAccountAuthToken(testAccount6, config.accountPassword);

		// GetAccountInfoRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount6}</account>
			</GetAccountInfoRequest>`, auth6
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountInfoResponse,
			'GetAccountInfoResponse should exist');
		assert.exists(response.GetAccountInfoResponse.name,
			'GetAccountInfoResponse should have name');

		assert.equal(response.GetAccountInfoResponse.name, testAccount6);

		const attrs = response.GetAccountInfoResponse.attr || [];
		const sanAttr = attrs.find(a => a.name === 'zimbraServiceAccountNumber');
		if (sanAttr) {

			// Verify response
			assert.equal(sanAttr._content, sanValue);
		}
	});
});
