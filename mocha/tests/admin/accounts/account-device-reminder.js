import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Device Reminder', function () {
	let adminAuthToken;
	let forwardAccountName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		forwardAccountName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${forwardAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
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
	it('Sanity | Create an account having cos with zimbraCalendarReminderDeviceEmail', async () => {
		const cosName = `Cos${common.getUniqueString()}`;

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const host = acctRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const reminderAttr = attrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');

		// Verify response
		assert.exists(reminderAttr, 'zimbraCalendarReminderDeviceEmail should be set');

		assert.equal(reminderAttr._content, forwardAccountName);

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		const modAttrs = modRes.ModifyAccountResponse.account[0].a || [];
		const cleared = modAttrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');

		// Verify response
		assert.isTrue(!cleared || cleared._content === '',
			'zimbraCalendarReminderDeviceEmail should be unset');
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmail', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const host = acctRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const reminderAttr = attrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');

		// Verify response
		assert.exists(reminderAttr, 'zimbraCalendarReminderDeviceEmail should be set');

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create an account having cos with zimbraCalendarReminderDeviceEmailEnabled false', async () => {
		const cosName = `Cos${common.getUniqueString()}`;

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">FALSE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const host = acctRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const enabledAttr = attrs.find(a => a.n === 'zimbraFeatureCalendarReminderDeviceEmailEnabled');
		if (enabledAttr) {

			// Verify response
			assert.equal(enabledAttr._content, 'FALSE');
		}

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmailEnabled FALSE', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const host = acctRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');
	});


	it('Sanity | ZimbraPrefCalendarReminderDeviceEmail should be on account only', async () => {
		const domainName = `domain.${common.getUniqueString()}.${config.testDomain}`;

		// Creating domain with zimbraCalendarReminderDeviceEmail should fail
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</CreateDomainRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(domRes.Fault.Detail.Error.Code,
			'Domain create with zimbraCalendarReminderDeviceEmail should fault');

		// Create domain normally
		const domRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">test of adding via SOAP</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		const domId = domRes2.CreateDomainResponse.domain[0].id;

		// Modifying domain with zimbraCalendarReminderDeviceEmail should fail
		const modDomRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domId}</id>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</ModifyDomainRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(modDomRes.Fault.Detail.Error.Code,
			'Domain modify with zimbraCalendarReminderDeviceEmail should fault');

		// Create COS and try to modify with zimbraCalendarReminderDeviceEmail - should fail
		const cosName = `Cos${common.getUniqueString()}`;

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// ModifyCosRequest
		const modCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCosRequest xmlns="urn:zimbraAdmin">
				<id>${cosId}</id>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</ModifyCosRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(modCosRes.Fault.Detail.Error.Code,
			'COS modify with zimbraCalendarReminderDeviceEmail should fault');

		// Create COS with zimbraCalendarReminderDeviceEmail should fail
		const cosRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">test_cos_${common.getUniqueString()}</name>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</CreateCosRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(cosRes2.Fault.Detail.Error.Code,
			'COS create with zimbraCalendarReminderDeviceEmail should fault');
	});
});
