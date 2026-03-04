import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Bug 39720', function () {
	let adminAuthToken;
	let adminAcctId, delegatedAdminId, regularAcctId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const adminAcctName = `admin.${common.getUniqueString()}@${config.testDomain}`;
		const delegatedAdminName =
			`admin.${common.getUniqueString()}@${config.testDomain}`;
		const regularAcctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const r1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${delegatedAdminName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(r1.Fault, 'Response should not be a Fault');
		assert.exists(r1.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = r1.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		delegatedAdminId = Array.isArray(r1.CreateAccountResponse.account) ? r1.CreateAccountResponse.account[0].id : r1.CreateAccountResponse.account.id;

		// Create account
		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${adminAcctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(r2.Fault, 'Response should not be a Fault');
		assert.exists(r2.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host2 = r2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		adminAcctId = Array.isArray(r2.CreateAccountResponse.account) ? r2.CreateAccountResponse.account[0].id : r2.CreateAccountResponse.account.id;

		// Create account
		const r3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${regularAcctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(r3.Fault, 'Response should not be a Fault');
		assert.exists(r3.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host3 = r3.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');

		regularAcctId = Array.isArray(r3.CreateAccountResponse.account) ? r3.CreateAccountResponse.account[0].id : r3.CreateAccountResponse.account.id;
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
	it('Smoke | Do not allow auth token lifetime to be zero', async () => {
		await common.sleep(2000);

		// ModifyAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${adminAcctId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Smoke | Do not allow auth token lifetime to be zero 1', async () => {
		await common.sleep(2000);

		// ModifyAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${regularAcctId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Smoke | Do not allow auth token lifetime to be zero 2', async () => {
		await common.sleep(2000);

		// ModifyAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${delegatedAdminId}</id>
				<a n="zimbraAuthTokenLifetime">0</a>
			</ModifyAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(response.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});
});
