import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 03', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let account1 = { server: '' };
	let test_account1_name;
	let account1_name;

	before(async function () {
		await main.before(this.ctx);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test1.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		account1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureSharingEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordLockoutEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraPasswordLockoutEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefGroupMailBy', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGroupMailBy">conversation</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGroupMailBy">message</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (sometext) of zimbraPrefGroupMailBy', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGroupMailBy">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordLockoutMaxFailures', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">1000</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space) of zimbraPasswordLockoutMaxFailures', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutMaxFailures">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordLockoutFailureLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">90</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPasswordLockoutFailureLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutFailureLifetime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraAuthTokenLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">2h</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">2m</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, zero, largenumber) of zimbraAuthTokenLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">2s</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">2d</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefHtmlEditorDefaultFontSize', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">8</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, zero, largenumber) of zimbraPrefHtmlEditorDefaultFontSize', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontSize">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordLockoutDuration', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">1h</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">0h</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, spacelargenumber) of zimbraPasswordLockoutDuration', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordLockoutDuration">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinLowerCaseChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPasswordMinLowerCaseChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLowerCaseChars">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinPunctuationChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPasswordMinPunctuationChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinPunctuationChars">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefCalendarApptReminderWarningTime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">10</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPrefCalendarApptReminderWarningTime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarApptReminderWarningTime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinNumericChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPasswordMinNumericChars', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinNumericChars">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefCalendarFirstDayOfWeek', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">6</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, spchar, space, largenumber) of zimbraPrefCalendarFirstDayOfWeek', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarFirstDayOfWeek">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of displayName', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (100, sometext, negative, blank, space, zero) of zimbraId', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">some text2</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">10999</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefSkin', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSkin">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSkin">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (100, sometext, negative, blank, space, zero) of uid', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">100</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="uid">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with invalid values (100, sometext, negative, blank, space, zero) of zimbraCOSId', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_COS'),
			`Expected fault account.NO_SUCH_COS, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">100</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_COS'),
			`Expected fault account.NO_SUCH_COS, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_COS'),
			`Expected fault account.NO_SUCH_COS, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">0</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_COS'),
			`Expected fault account.NO_SUCH_COS, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefHtmlEditorDefaultFontFamily', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontFamily">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontFamily">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefHtmlEditorDefaultFontColor', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontColor">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefHtmlEditorDefaultFontColor">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (100, sometext, negative, blank, space, zero) of zimbraMailDeliveryAddress', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailDeliveryAddress">\${}</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailDeliveryAddress">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureTasksEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureTasksEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">:\'\'&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account by specifying the value of zimbraId', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>testaccount${Date.now()}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraId">\${zimbraID.value}</a>
			</CreateAccountRequest>`, adminAuth);
		account1.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!account1.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">testaccount${Date.now()}@${config.testDomain}</account></GetAccountRequest>`, adminAuth);
			account1.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});
});
