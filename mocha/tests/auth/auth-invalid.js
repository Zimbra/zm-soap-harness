import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Auth Invalid', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let validUser;
	let validUserShort;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create valid test account
		validUserShort = 'user' + common.getUniqueString();
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
	it('Smoke | Login with an invalid password', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>invalid_password</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Sanity | 1. login with no domain 2. auth should succeed, if account is assigned to the default domain', async () => {
		// Get the server's default domain name
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraDefaultDomainName" />
			</GetConfigRequest>`, adminAuthToken
		);
		const configAttrs = configRes.GetConfigResponse.a;
		const defaultDomainAttr = Array.isArray(configAttrs)
			? configAttrs.find(a => a.n === 'zimbraDefaultDomainName')
			: configAttrs;
		const defaultDomain = defaultDomainAttr ? defaultDomainAttr._content : config.testDomain;

		// Create account on default domain
		const defaultDomainUser = 'user' + common.getUniqueString();
		const defaultDomainFullName = defaultDomainUser + '@' + defaultDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${defaultDomainFullName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse,
			'Should create account on default domain');

		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${defaultDomainUser}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');

		const lifetime = response.AuthResponse.lifetime;
		assert.exists(lifetime, 'lifetime should exist');
		assert.match(String(lifetime._content || lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Login with invalid user name and invalid password', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">invalid_user@${config.testDomain}</account>
				<password>invalid_password</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as domain that doesnt exist', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@invalid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with a domain that has a comma', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@invalid_domain,com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as an invalid email account', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">invalid_user@${config.testDomain}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as a user with leading spaces', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name"> ${validUserShort}@invalid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as trailing spaces', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@invalid_domain.com </account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as space before the at symbol', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort} @invalid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as space within the email', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">use r1@invalid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as space after the at symbol', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@ invalid_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login as space within the domain', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUserShort}@invali d_domain.com</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with no domain, but with an at symbol', async () => {
		const invalidUsers = [
			validUserShort + '@',
			validUserShort + '@@',
			validUserShort + '@@@',
			validUserShort + '@@invalid_domain.com',
			validUserShort + '@@' + config.testDomain
		];

		for (const invalidUser of invalidUsers) {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${invalidUser}</account>
					<password>${config.accountPassword}</password>
				</AuthRequest>`, null, true
			);
			assert.exists(response.Fault, 'Should return Fault for: ' + invalidUser);
			assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should return INVALID_REQUEST for: ' + invalidUser);
		}
	});


	it('Functional | Login with periods in the address', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">first1.middle.last1@${config.testDomain}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with password with a leading space', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password> ${config.accountPassword}</password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with password with trailing spaces', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>${config.accountPassword} </password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});


	it('Functional | Login with password in capital letters', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${validUser}</account>
				<password>${config.accountPassword.toUpperCase()} </password>
			</AuthRequest>`, null, true
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED');
	});
});
