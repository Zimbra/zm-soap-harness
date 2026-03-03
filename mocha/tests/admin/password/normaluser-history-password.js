import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > NormalUser History Password', function () {
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
	it('Sanity | Verify that a user can set a new password if enforce history 1', async () => {
		// Create account with enforceHistory=1
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth and change to new password — should succeed
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
	});


	it('Sanity | Verify that a user cannot reuse his last password if enforce history 1', async () => {
		// Create account with enforceHistory=1
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Change to password_1
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);

		// Change to password_2
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);

		// Try reuse password_2 — should fail
		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token, false
		);
		assert.isString(changeRes.Fault.Detail.Error.Code, 'Reusing last password should fault');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_RECENTLY_USED');
	});


	it('Sanity | Verify that a user can reuse his second-to-last password if enforce history 1', async () => {
		// Create account with enforceHistory=1
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">1</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Change orig -> password_1
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);

		// Change password_1 -> password_2
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);

		// Reuse password_1 (2nd-to-last) — should succeed with history=1
		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing second-to-last password should not fault');
	});


	it('Sanity | Verify that a user cannot reuse his default provisioned password if enforce history 1 2', async () => {
		// Create account with enforceHistory=3
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth and try to reuse same password — should fail
		const token = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>${origPassword}</password>
			</ChangePasswordRequest>`, token, false
		);
		assert.isString(changeRes.Fault.Detail.Error.Code, 'Reusing default password should fault');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.PASSWORD_RECENTLY_USED');
	});


	it('Functional | Verify that the user cannot reuse his last 3 passwords if enforce history 3', async () => {
		// Create account with enforceHistory=3
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Chain of password changes: orig -> p1 -> p2 -> p3 -> p4
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);

		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);

		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, token
		);

		token = await soap.getAccountAuthToken(accountEmail, 'three67890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, token
		);

		// Try reusing password_4 (current) — should fail
		token = await soap.getAccountAuthToken(accountEmail, 'four567890');
		const reuse1 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, token, false
		);
		assert.isString(reuse1.Fault.Detail.Error.Code, 'Reusing current password should fault');
		assert.include(reuse1.Fault.Detail.Error.Code, 'account.PASSWORD_RECENTLY_USED');

		// Try reusing password_3 — should fail
		const reuse2 = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, token, false
		);
		assert.isString(reuse2.Fault.Detail.Error.Code, 'Reusing 3rd-to-last password should fault');
		assert.include(reuse2.Fault.Detail.Error.Code, 'account.PASSWORD_RECENTLY_USED');
	});


	it('Functional | verify that the user can use his 4th password, if enforce history 3', async () => {
		// Create account with enforceHistory=3
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Chain: orig -> p1 -> p2 -> p3 -> p4
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'three67890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>four567890</password>
			</ChangePasswordRequest>`, token
		);

		// Reuse p1 (4th back) — should succeed with history=3
		token = await soap.getAccountAuthToken(accountEmail, 'four567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>four567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing 4th-back password should not fault');
	});


	it('Functional | Verify that the user can a new, unused password, if enforce history 3', async () => {
		// Create account with enforceHistory=3
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Chain: orig -> p1
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);

		// p1 -> p5 (brand new) — should succeed
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>five567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Setting unused password should not fault');
	});


	it('Functional | Verify that the user can reuse his default password, after setting 3 passwords, if enforce history 3', async () => {
		// Create account with enforceHistory=3
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Chain: orig -> p1 -> p2 -> p3 -> p5
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>three67890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'three67890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>three67890</oldPassword>
				<password>five567890</password>
			</ChangePasswordRequest>`, token
		);

		// Reuse default password — should succeed (4th+ back)
		token = await soap.getAccountAuthToken(accountEmail, 'five567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>five567890</oldPassword>
				<password>${origPassword}</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing default password after 3 should not fault');
	});


	it('Functional | Verify that a user can reuse his default provisioned password if enforce history 0', async () => {
		// Create account with enforceHistory=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth and reuse same password — should succeed (history=0)
		const token = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>${origPassword}</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing default password with history=0 should not fault');
	});


	it('Functional | Verify that a user can reuse his last password if enforce history 0', async () => {
		// Create account with enforceHistory=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// orig -> p1
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);

		// p1 -> p1 (reuse last) — should succeed with history=0
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing last password with history=0 should not fault');
	});


	it('Functional | Verify that a user can reuse his 2nd password if enforce history 0', async () => {
		// Create account with enforceHistory=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// orig -> p1 -> p2 -> p1 (reuse 2nd-to-last)
		let token = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'one4567890');
		await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>one4567890</oldPassword>
				<password>two4567890</password>
			</ChangePasswordRequest>`, token
		);
		token = await soap.getAccountAuthToken(accountEmail, 'two4567890');
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>two4567890</oldPassword>
				<password>one4567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Reusing 2nd password with history=0 should not fault');
	});


	it('Functional | Verify that a user can set a new password if enforce history 0', async () => {
		// Create account with enforceHistory=0
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const origPassword = config.accountPassword;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${origPassword}</password>
				<a n="zimbraPasswordEnforceHistory">0</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// orig -> p5 (brand new)
		const token = await soap.getAccountAuthToken(accountEmail);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${origPassword}</oldPassword>
				<password>five567890</password>
			</ChangePasswordRequest>`, token
		);
		assert.notExists(changeRes.Fault, 'Setting new password with history=0 should not fault');
	});
});
