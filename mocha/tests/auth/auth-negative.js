import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Auth > Auth Negative', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let validUser;
	let validUserShort;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create valid test account
		validUserShort = 'user1' + common.getUniqueString();
		validUser = validUserShort + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		assert.isString(acct.id, 'Account ID should be a string');
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
	it('Functional | Login with a domain with a left parenthes 1', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@inva(lid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with less than', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@inva&lt;lid_domain,com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a left parenthes 2', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim(bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a right parenthes', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zimbr)a.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a vertical bar', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim|bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with an ampersand', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zimbr&amp;a.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a semicolon', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@z;imbra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a equals sign', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim=bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a left parenthes', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes(t123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a right parenthes', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes)t123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a vertical bar', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test|123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a ampersand', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test&amp;123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a semi-colon', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes;t123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a equals sign', async () => {
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test=123</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});
});
