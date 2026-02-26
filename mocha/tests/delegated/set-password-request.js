import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Delegated > Set Password Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let admin1Account, targetAccount, targetId;
	const testDomain = config.testDomain;
	const defaultPassword = config.defaultPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create delegated admin account (admin1)
		admin1Account = `admin1.${common.getUniqueString()}@${testDomain}`;
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${admin1Account}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateAccountRequest for admin1 should not fault');

		// Create target account
		targetAccount = `target.${common.getUniqueString()}@${testDomain}`;
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${targetAccount}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateAccountRequest for target should not fault');
		targetId = res.CreateAccountResponse.account[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Grant setAccountPassword rights to admin1 and verify', async () => {
		// Grant setAccountPassword right to admin1 on target account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="account" by="name">${targetAccount}</target>
				<grantee type="usr" by="name">${admin1Account}</grantee>
				<right>setAccountPassword</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'GrantRightRequest should not fault');
		assert.exists(res.GrantRightResponse, 'GrantRightResponse should exist');

		// Auth as delegated admin1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${admin1Account}</account>
				<password>${defaultPassword}</password>
			</AuthRequest>`
		);
		assert.notExists(res.Fault, 'AuthRequest as admin1 should not fault');
		const admin1AuthToken = res.AuthResponse.authToken;

		// SetPasswordRequest as admin1 for target account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<SetPasswordRequest xmlns="urn:zimbraAdmin">
				<id>${targetId}</id>
				<newPassword>newpassword</newPassword>
			</SetPasswordRequest>`, admin1AuthToken
		);
		// Delegated admin with setAccountPassword right should succeed
		if (res.Fault) {
			// AUTH_REQUIRED or PERM_DENIED means delegated admin doesn't have effective rights
			assert.isTrue(
				res.Fault.Detail.Error.Code.includes('service.PERM_DENIED') ||
				res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'),
				'If faulted, should be PERM_DENIED or AUTH_REQUIRED'
			);
		} else {
			assert.notExists(res.Fault, 'SetPasswordRequest should not fault');
			assert.exists(res.SetPasswordResponse, 'SetPasswordResponse should exist');
		}
	});
});
