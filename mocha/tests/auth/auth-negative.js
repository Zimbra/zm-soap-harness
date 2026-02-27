import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Negative', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let validUser;
	let validUserShort;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create valid test account
		validUserShort = 'user1' + common.getUniqueString();
		validUser = validUserShort + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${validUser}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create test account');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Login with a domain with a left parenthes 1', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@inva(lid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with less than', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@inva&lt;lid_domain,com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a left parenthes 2', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim(bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a right parenthes', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zimbr)a.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a vertical bar', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim|bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with an ampersand', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zimbr&amp;a.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a semicolon', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@z;imbra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain with a equals sign', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@zim=bra.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a left parenthes', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes(t123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a right parenthes', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes)t123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a vertical bar', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test|123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a ampersand', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test&amp;123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a semi-colon', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>tes;t123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a password with a equals sign', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>test=123</password>
			</AuthRequest>`, null
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});
});
