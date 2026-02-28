import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > Password > History Password', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify cannot reuse default password with enforce history 1', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${config.accountPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(changeRes.Fault, 'Should fail - password recently used');
		assert.include(changeRes.Fault.Detail.Error.Code,
			'account.PASSWORD_RECENTLY_USED',
			'Error code should be PASSWORD_RECENTLY_USED');
	});


	it('Sanity | Verify can set a new password with enforce history 1', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'Should succeed with new password');
	});


	it('Sanity | Verify cannot reuse last password with enforce history 1', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(reuseRes.Fault, 'Should fail - password recently used');
	});


	it('Sanity | Verify can reuse second-to-last password with enforce history 1', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>${config.accountPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - 2nd-to-last password reusable with history 1');
	});


	it('Functional | Verify cannot reuse last 3 passwords with enforce history 3', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'three67890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'four567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(reuseRes.Fault,
			'Should fail - password within last 3 history');
	});


	it('Functional | Verify can use 4th password with enforce history 3', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'three67890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'four567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - 4th password outside history 3');
	});


	it('Functional | Verify can reuse password with enforce history 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${config.accountPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - no history enforcement');
	});


	it('Functional | Verify can use a new, unused password with enforce history 3', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		const newRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>brand_new1</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(newRes.Fault, 'Should succeed with brand new password');
	});


	it('Functional | Verify can reuse default password after setting 3 passwords with enforce history 3', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'three67890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 600));
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'four567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>${config.accountPassword}</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - default password outside history 3');
	});


	it('Functional | Verify can reuse last password with enforce history 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - no history enforcement');
	});


	it('Functional | Verify can reuse 2nd password with enforce history 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'one4567890');

		// ChangePasswordRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, 'two4567890');

		// ChangePasswordRequest
		const reuseRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(reuseRes.Fault,
			'Should succeed - no history enforcement');
	});


	it('Functional | Verify can set a new password with enforce history 0', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>newpass7890</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault,
			'Should succeed with new password - no history enforcement');
	});
});
