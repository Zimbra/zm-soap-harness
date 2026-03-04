import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > Complex Set Password', function () {
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
	it('Sanity | Verify SetPasswordRequest(admin) requires the specified complexity', async () => {
		// Create account with complex password requirements
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const validPassword = 'ABCDEFabcdef123456,.?!;:';
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">4</a>
				<a n="zimbraPasswordMinLowerCaseChars">4</a>
				<a n="zimbraPasswordMinPunctuationChars">4</a>
				<a n="zimbraPasswordMinNumericChars">4</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		// Set password with valid complexity
		const setRes = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${validPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(setRes.Fault, 'SetPasswordRequest should not fault');
	});


	it('Sanity | Verify SetPasswordRequest(admin) does not require the specified complexity', async () => {
		// Create account with complex password requirements
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const validPassword = 'ABCDEFabcdef123456,.?!;:';
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${validPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">4</a>
				<a n="zimbraPasswordMinLowerCaseChars">4</a>
				<a n="zimbraPasswordMinPunctuationChars">4</a>
				<a n="zimbraPasswordMinNumericChars">4</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		// Admin SetPassword does NOT require complexity (Bug 11753)
		const setRes = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>ABCabc123!@#</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(setRes.Fault, 'SetPasswordRequest with less complex password should not fault');
	});
});
