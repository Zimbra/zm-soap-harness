import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Password > Complex Password', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const validPassword = 'ABCDEFabcdef123456,.?!;:';

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
	it('Sanity | Verify zimbraPasswordMinUpperCaseChars requires minimum upper case letters', async () => {
		const accountEmail = `complex${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">5</a>
				<a n="zimbraPasswordMinLowerCaseChars">0</a>
				<a n="zimbraPasswordMinPunctuationChars">0</a>
				<a n="zimbraPasswordMinNumericChars">0</a>
				<a n="zimbraPasswordMinLength">0</a>
				<a n="zimbraPasswordMaxLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, validPassword);

		// Change password
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>ABCD</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(failRes.Fault, 'Should fail with not enough upper case');
		assert.include(failRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD',
			'Error code should be account.INVALID_PASSWORD');

		// Change password
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>ABCDE</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(successRes.Fault, 'Should succeed with 5 upper case chars');
	});


	it('Sanity | Verify zimbraPasswordMinLowerCaseChars requires minimum lower case letters', async () => {
		const accountEmail = `complex${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">0</a>
				<a n="zimbraPasswordMinLowerCaseChars">5</a>
				<a n="zimbraPasswordMinPunctuationChars">0</a>
				<a n="zimbraPasswordMinNumericChars">0</a>
				<a n="zimbraPasswordMinLength">0</a>
				<a n="zimbraPasswordMaxLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, validPassword);

		// Change password
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>abcd</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(failRes.Fault, 'Should fail with not enough lower case');

		// Change password
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>abcde</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(successRes.Fault, 'Should succeed with 5 lower case chars');
	});


	it('Sanity | Verify zimbraPasswordMinNumericChars requires minimum numeric chars (bug 11540)', async () => {
		const accountEmail = `complex${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">0</a>
				<a n="zimbraPasswordMinLowerCaseChars">0</a>
				<a n="zimbraPasswordMinNumericChars">5</a>
				<a n="zimbraPasswordMinPunctuationChars">0</a>
				<a n="zimbraPasswordMinLength">0</a>
				<a n="zimbraPasswordMaxLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, validPassword);

		// Change password
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>1234</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(failRes.Fault, 'Should fail with not enough numeric chars');

		// Change password
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>12345</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(successRes.Fault, 'Should succeed with 5 numeric chars');
	});


	it('Sanity | Verify zimbraPasswordMinPunctuationChars requires minimum punctuation chars', async () => {
		const accountEmail = `complex${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">0</a>
				<a n="zimbraPasswordMinLowerCaseChars">0</a>
				<a n="zimbraPasswordMinNumericChars">0</a>
				<a n="zimbraPasswordMinPunctuationChars">5</a>
				<a n="zimbraPasswordMinLength">0</a>
				<a n="zimbraPasswordMaxLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, validPassword);

		// Change password
		const failRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>,.?!</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(failRes.Fault, 'Should fail with not enough punctuation chars');

		// Change password
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>,.?!;</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(successRes.Fault, 'Should succeed with 5 punctuation chars');
	});


	it('Sanity | Verify combined complexity requirements', async () => {
		const accountEmail = `complex${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">3</a>
				<a n="zimbraPasswordMinLowerCaseChars">2</a>
				<a n="zimbraPasswordMinPunctuationChars">1</a>
				<a n="zimbraPasswordMinNumericChars">4</a>
				<a n="zimbraPasswordMinLength">0</a>
				<a n="zimbraPasswordMaxLength">64</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, validPassword);

		// Change password
		const successRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<oldPassword>${validPassword}</oldPassword>
				<password>ABCab1234!</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(successRes.Fault,
			'Should succeed with all complexity requirements met');
	});
});
