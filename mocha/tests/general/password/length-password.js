import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Password > Length Password', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Test password length with default settings (min 6, max 64)', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const failEmpty = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password></password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(failEmpty.Fault.Detail.Error.Code, 'Empty password should fail');

		// Change password
		const fail5 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>12345</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(fail5.Fault.Detail.Error.Code, '5-char password should fail with default min 6');

		// Change password
		const success6 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>123456</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success6.Fault, '6-char password should succeed');
	});


	it('Sanity | Test 63-char and 64-char passwords with default max 64', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);
		const pass63 = '1'.repeat(63);

		// Change password
		const success63 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${pass63}</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success63.Fault, '63-char password should succeed');
	});


	it('Sanity | Test 65-char password exceeds default max 64', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);
		const pass65 = '1'.repeat(65);

		// Change password
		const fail65 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${pass65}</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(fail65.Fault.Detail.Error.Code, '65-char password should fail with default max 64');
	});


	it('Functional | Test password length with min 0, max 0 (no restrictions)', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxLength">0</a>
				<a n="zimbraPasswordMinLength">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const successEmpty = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password></password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(successEmpty.Fault,
			'Empty password should succeed with min 0');
	});


	it('Functional | Test password length with max 1, min 0 (bug 4592)', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>t</password>
				<a n="zimbraPasswordMaxLength">1</a>
				<a n="zimbraPasswordMinLength">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail, 't');

		// Change password
		const success1 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>t</oldPassword>
				<password>a</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success1.Fault, '1-char password should succeed with max 1');
	});


	it('Functional | Test password length with max 64, min 0', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxLength">64</a>
				<a n="zimbraPasswordMinLength">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const successEmpty = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password></password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(successEmpty.Fault,
			'Empty password should succeed with min 0');
	});


	it('Functional | Test password length with min 1, max 0', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxLength">0</a>
				<a n="zimbraPasswordMinLength">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const success1 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>a</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success1.Fault, '1-char password should succeed');
	});


	it('Functional | Test password length with min 64, max 64', async () => {
		const pass64 = '1'.repeat(64);
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${pass64}</password>
				<a n="zimbraPasswordMaxLength">64</a>
				<a n="zimbraPasswordMinLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail, pass64);
		const pass63 = '2'.repeat(63);

		// Change password
		const fail63 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${pass64}</oldPassword>
				<password>${pass63}</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(fail63.Fault.Detail.Error.Code, '63-char password should fail with min 64');
	});


	it('Functional | Test password length with max 1, min 1 (bug 4592)', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>t</password>
				<a n="zimbraPasswordMaxLength">1</a>
				<a n="zimbraPasswordMinLength">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail, 't');

		// Change password
		const failEmpty = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>t</oldPassword>
				<password></password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(failEmpty.Fault.Detail.Error.Code, 'Empty password should fail with min 1');

		// Change password
		const success1 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>t</oldPassword>
				<password>a</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success1.Fault, '1-char password should succeed with max 1, min 1');
	});


	it('Functional | Test password length with max 64, min 1', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxLength">64</a>
				<a n="zimbraPasswordMinLength">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const failEmpty = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password></password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(failEmpty.Fault.Detail.Error.Code, 'Empty password should fail with min 1');

		// Change password
		const success1 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>a</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success1.Fault, '1-char password should succeed with min 1');
	});


	it('Functional | Test password length with min 6, max 0 (no max restriction)', async () => {
		const accountEmail = `lentest${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxLength">0</a>
				<a n="zimbraPasswordMinLength">6</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authRes = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const fail5 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>12345</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.isString(fail5.Fault.Detail.Error.Code, '5-char password should fail with min 6');

		// Change password
		const success6 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>123456</password>
			</ChangePasswordRequest>`, authRes
		);

		// Verify response
		assert.notExists(success6.Fault, '6-char password should succeed with min 6');
	});
});
