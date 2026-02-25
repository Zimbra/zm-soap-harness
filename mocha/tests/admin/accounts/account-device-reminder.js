import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Device Reminder', function () {
	let adminAuthToken;
	let forwardAccountName;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		forwardAccountName = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${forwardAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create account with COS having zimbraCalendarReminderDeviceEmail enabled, then unset', async () => {
		const cosName = `Cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const reminderAttr = attrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');
		assert.exists(reminderAttr, 'zimbraCalendarReminderDeviceEmail should be set');
		assert.equal(reminderAttr._content, forwardAccountName);

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifyAccountResponse);

		const modAttrs = modRes.ModifyAccountResponse.account[0].a || [];
		const cleared = modAttrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');
		assert.isTrue(!cleared || cleared._content === '',
			'zimbraCalendarReminderDeviceEmail should be unset');
	});


	it('Smoke | Create account with zimbraCalendarReminderDeviceEmail enabled on account, then unset', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const reminderAttr = attrs.find(a => a.n === 'zimbraCalendarReminderDeviceEmail');
		assert.exists(reminderAttr, 'zimbraCalendarReminderDeviceEmail should be set');

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifyAccountResponse);
	});


	it('Smoke | Create account with COS having zimbraCalendarReminderDeviceEmailEnabled FALSE, then unset', async () => {
		const cosName = `Cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">FALSE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;
		const attrs = acctRes.CreateAccountResponse.account[0].a || [];
		const enabledAttr = attrs.find(a => a.n === 'zimbraFeatureCalendarReminderDeviceEmailEnabled');
		if (enabledAttr) {
			assert.equal(enabledAttr._content, 'FALSE');
		}

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifyAccountResponse);
	});


	it('Smoke | Create account with zimbraCalendarReminderDeviceEmailEnabled FALSE on account, then unset', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalendarReminderDeviceEmail">${forwardAccountName}</a>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;

		// Unset
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraCalendarReminderDeviceEmail"></a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifyAccountResponse);
	});


	it('Regression | zimbraCalendarReminderDeviceEmail should be on account only (not domain/cos)', async () => {
		const domainName = `domain.${common.getUniqueString()}.${config.testDomain}`;

		// Creating domain with zimbraCalendarReminderDeviceEmail should fail
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.exists(domRes.Fault,
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
			</ModifyDomainRequest>`, adminAuthToken
		);
		assert.exists(modDomRes.Fault,
			'Domain modify with zimbraCalendarReminderDeviceEmail should fault');

		// Create COS and try to modify with zimbraCalendarReminderDeviceEmail - should fail
		const cosName = `Cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const modCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCosRequest xmlns="urn:zimbraAdmin">
				<id>${cosId}</id>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</ModifyCosRequest>`, adminAuthToken
		);
		assert.exists(modCosRes.Fault,
			'COS modify with zimbraCalendarReminderDeviceEmail should fault');

		// Create COS with zimbraCalendarReminderDeviceEmail should fail
		const cosRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">test_cos_${common.getUniqueString()}</name>
				<a n="zimbraCalendarReminderDeviceEmail">test@test.com</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.exists(cosRes2.Fault,
			'COS create with zimbraCalendarReminderDeviceEmail should fault');
	});
});
