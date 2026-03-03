import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > Bug60973', function () {
	this.timeout(60 * 1000);
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
	it('Sanity | Password Rule zimbraPasswordMinDigitsOrPuncs on account', async () => {
		// Create account with valid password (meeting the rule)
		const account1Email = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinDigitsOrPuncs">3</a>
				<a n="zimbraPasswordAllowedPunctuationChars">[#!@%]</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest with valid password should not fault');

		// Create account with invalid password (not enough digits/puncs)
		const account2Email = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>test23qweqwewe</password>
				<a n="zimbraPasswordMinDigitsOrPuncs">3</a>
				<a n="zimbraPasswordAllowedPunctuationChars">[#!@%]</a>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.isString(createRes2.Fault.Detail.Error.Code, 'CreateAccountRequest with invalid password should fault');
		assert.include(createRes2.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');
	});


	it('Sanity | Password policy on changepasswordrequest with valid password as per rule', async () => {
		// Create account with password rule
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const originalPassword = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${originalPassword}</password>
				<a n="zimbraPasswordMinDigitsOrPuncs">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Change password with valid password (has enough digits/puncs)
		const newPassword = 'tes!@1';
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${accountEmail}</account>
				<oldPassword>${originalPassword}</oldPassword>
				<password>${newPassword}</password>
			</ChangePasswordRequest>`, accountToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest with valid password should not fault');

		// Verify can auth with new password
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${accountEmail}</account>
				<password>${newPassword}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest with new password should not fault');
	});


	it('Sanity | Password policy on changepasswordrequest with invalid password as per rule', async () => {
		// Create account with password rule
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const originalPassword = 'test%@3';
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${originalPassword}</password>
				<a n="zimbraPasswordMinDigitsOrPuncs">3</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail, originalPassword);

		// Change password with invalid password (not enough digits/puncs)
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${accountEmail}</account>
				<oldPassword>${originalPassword}</oldPassword>
				<password>3testRasd1</password>
			</ChangePasswordRequest>`, accountToken, false
		);
		assert.isString(changeRes.Fault.Detail.Error.Code, 'ChangePasswordRequest with invalid password should fault');

		// Verify original password still works
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${accountEmail}</account>
				<password>${originalPassword}</password>
			</AuthRequest>`
		);
		assert.notExists(authRes.Fault, 'AuthRequest with original password should still work');
	});
});
