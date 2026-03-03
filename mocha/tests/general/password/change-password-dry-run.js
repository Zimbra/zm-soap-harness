import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Password > Change Password Dry Run', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let cosId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const cosName = `COS${common.getUniqueString()}`;
		account1Email = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create COS with password rules
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraPasswordMinLength">6</a>
				<a n="zimbraPasswordMinDigitsOrPuncs">3</a>
				<a n="zimbraPasswordAllowedPunctuationChars">[#!@%$]</a>
				<a n="zimbraPasswordMinUpperCaseChars">1</a>
				<a n="zimbraPasswordMinLowerCaseChars">2</a>
				<a n="zimbraPasswordEnforceHistory">5</a>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		cosId = cos.id;

		// Create account with the COS
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>Test12$</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
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
	it('Sanity | Verify ChangePassword with dryrun returns correct error when zimbraPasswordMinLength rule condition fails and password is not changed', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Test12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>Test12$</oldPassword>
				<password>Te12$</password>
				<dryRun>1</dryRun>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.isString(changeRes.Fault.Detail.Error.Code, 'Should return Fault for invalid password');
		assert.include(changeRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD',
			'Error code should be INVALID_PASSWORD');

		// AuthRequest
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Te12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyRes.Fault.Detail.Error.Code, 'Short password should not work');
		assert.include(verifyRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// AuthRequest
		const origRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Test12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(origRes.Fault, 'Original password should still work');
	});


	it('Sanity | Verify ChangePassword with dryrun returns correct error when zimbraPasswordEnforceHistory rule condition fails and password is not changed', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Test12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>Test12$</oldPassword>
				<password>34Abc#</password>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');

		// AuthRequest
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>34Abc#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes2.Fault, 'AuthRequest with new password should not fault');
		const accountAuthToken2 = authRes2.AuthResponse.authToken[0]._content;

		// Change password
		const dryRunRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>Test12$</password>
				<dryRun>true</dryRun>
			</ChangePasswordRequest>`, accountAuthToken2
		);

		// Verify response
		assert.isString(dryRunRes.Fault.Detail.Error.Code, 'Should return Fault for password recently used');
		assert.include(dryRunRes.Fault.Detail.Error.Code, 'account.PASSWORD_RECENTLY_USED',
			'Error code should be PASSWORD_RECENTLY_USED');

		// AuthRequest
		const verifyOldRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Test12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyOldRes.Fault.Detail.Error.Code, 'Old password should not work');

		// AuthRequest
		const verifyCurRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>34Abc#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(verifyCurRes.Fault, 'Current password should still work');
	});


	it('Sanity | Verify ChangePassword with dryrun returns correct error when zimbraPasswordMinDigitsOrPuncs, zimbraPasswordMinUpperCaseChars, zimbraPasswordMinLowerCaseChars rule condition fails and password is not changed', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>34Abc#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const numPuncRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>Test1#</password>
				<dryRun>1</dryRun>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.isString(numPuncRes.Fault.Detail.Error.Code, 'Should fault for insufficient digits/puncs');
		assert.include(numPuncRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');

		// Change password
		const upperRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>test12$</password>
				<dryRun>1</dryRun>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.isString(upperRes.Fault.Detail.Error.Code, 'Should fault for insufficient uppercase');
		assert.include(upperRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');

		// Change password
		const lowerRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>TEST12$</password>
				<dryRun>1</dryRun>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.isString(lowerRes.Fault.Detail.Error.Code, 'Should fault for insufficient lowercase');
		assert.include(lowerRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');

		// AuthRequest
		const verifyRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>TEST12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyRes1.Fault.Detail.Error.Code, 'Invalid password should not work');

		// AuthRequest
		const verifyRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>test12$</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyRes2.Fault.Detail.Error.Code, 'Invalid password should not work');

		// AuthRequest
		const verifyRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>Test1#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyRes3.Fault.Detail.Error.Code, 'Invalid password should not work');
	});


	it('Sanity | Verify ChangePassword with dryrun with valid password does not change password, password is changed without dryrun', async () => {
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>34Abc#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest should not fault');
		const accountAuthToken = authRes.AuthResponse.authToken[0]._content;

		// Change password
		const dryRunRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>!Pnq45</password>
				<dryRun>1</dryRun>
			</ChangePasswordRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(dryRunRes.Fault, 'DryRun with valid password should not fault');

		// AuthRequest
		const verifyNewRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>!Pnq45</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.isString(verifyNewRes.Fault.Detail.Error.Code, 'DryRun password should not work');

		// AuthRequest
		const verifyOldRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>34Abc#</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(verifyOldRes.Fault, 'Old password should still work');
		const accountAuthToken2 = verifyOldRes.AuthResponse.authToken[0]._content;

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<oldPassword>34Abc#</oldPassword>
				<password>!Pnq45</password>
			</ChangePasswordRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');

		// AuthRequest
		const finalRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account>${account1Email}</account>
				<password>!Pnq45</password>
			</AuthRequest>`, ''
		);

		// Verify response
		assert.notExists(finalRes.Fault, 'New password should work after real change');
	});
});
