import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Bug 39720', function () {
	let adminAuthToken;
	let adminAcctId, delegatedAdminId, regularAcctId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		const adminAcctName = `admin.${common.getUniqueString()}@${config.testDomain}`;
		const delegatedAdminName =
			`admin.${common.getUniqueString()}@${config.testDomain}`;
		const regularAcctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		const r1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${delegatedAdminName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(r1.CreateAccountResponse, 'delegatedAdmin account creation failed');

		delegatedAdminId = Array.isArray(r1.CreateAccountResponse.account) ? r1.CreateAccountResponse.account[0].id : r1.CreateAccountResponse.account.id;

		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${adminAcctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(r2.CreateAccountResponse, 'adminAcct account creation failed');

		adminAcctId = Array.isArray(r2.CreateAccountResponse.account) ? r2.CreateAccountResponse.account[0].id : r2.CreateAccountResponse.account.id;

		const r3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${regularAcctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(r3.CreateAccountResponse, 'regularAcct account creation failed');

		regularAcctId = Array.isArray(r3.CreateAccountResponse.account) ? r3.CreateAccountResponse.account[0].id : r3.CreateAccountResponse.account.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Do not allow auth token lifetime to be zero for admin account', async () => {
		await common.sleep(2000);
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${adminAcctId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Smoke | Do not allow auth token lifetime to be zero for regular account', async () => {
		await common.sleep(2000);
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${regularAcctId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Smoke | Do not allow auth token lifetime to be zero for delegated admin', async () => {
		await common.sleep(2000);
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${delegatedAdminId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});

});
