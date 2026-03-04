import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > Password Set', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let accountId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create a test account
		const accountEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountId = acct.id;
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
	it('Smoke | SetPasswordRequest with valid new password', async () => {
		const newPassword = 'test1234';
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${newPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest should not fault');
	});

	it('Sanity | Set newpassword to same as the old password', async () => {
		const newPassword = 'test1234';
		// Set password first
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${newPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res1.Fault, 'First SetPasswordRequest should not fault');

		// Set same password again
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${newPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'Second SetPasswordRequest should not fault');
	});

	it('Regression | SetPassword of an account to some special character', async () => {
		// Original XML: :'&<;//\\ — need to XML-encode special chars
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>:'&amp;&lt;;//\\</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest with special chars should not fault');
	});

	it('Regression | SetPassword of an account to blank', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword></newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest with blank should not fault');
	});

	it('Regression | Set newpassword to very long value', async () => {
		const longPassword = 'a1234567890123456789012345678901234567890123456789012345678901234567890';
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${longPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest with long password should not fault');
	});

	it('Regression | Set newpassword to very short value', async () => {
		const shortPassword = 'a';
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${shortPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest with short password should not fault');
	});

	it('Regression | Set newpassword with spaces in between', async () => {
		const spacedPassword = `${Date.now()}         ${common.getUniqueString()}                   123`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<newPassword>${spacedPassword}</newPassword>
			</SetPasswordRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'SetPasswordRequest with spaces should not fault');
	});

	it('Regression | Set newpassword with invalid id', async () => {
		const invalidId = `123${Date.now()}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${invalidId}</id>
				<newPassword>test1234</newPassword>
			</SetPasswordRequest>`, adminAuthToken, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'SetPasswordRequest with invalid id should fault');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});
});
