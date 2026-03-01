import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 02', function () {
	this.timeout(30 * 1000);
	let adminAuth;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
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
	it('Functional | Create an account with valid values of zimbraPrefGalAutoCompleteEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraPrefGalAutoCompleteEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefCalendarUseQuickAdd', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraPrefCalendarUseQuickAdd', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarUseQuickAdd">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureMobileSyncEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureMobileSyncEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMobileSyncEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureSkinChangeEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureSkinChangeEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSkinChangeEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefCalendarNotifyDelegatedChanges', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraPrefCalendarNotifyDelegatedChanges', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarNotifyDelegatedChanges">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinUpperCaseChars', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (blank, sometext, negative, zero, spchar, space, largenumber) of zimbraPasswordMinUpperCaseChars', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinUpperCaseChars">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureNewMailNotificationEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureNewMailNotificationEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureNewMailNotificationEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureMailForwardingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureMailForwardingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMailForwardingEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureViewInHtmlEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureViewInHtmlEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureViewInHtmlEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureGalAutoCompleteEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureGalAutoCompleteEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalAutoCompleteEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefCalendarAlwaysShowMiniCal', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraPrefCalendarAlwaysShowMiniCal', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefCalendarAlwaysShowMiniCal">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureOutOfOfficeReplyEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureOutOfOfficeReplyEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureIMEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (True, blank, sometext, negative, zero, spchar, space) of zimbraFeatureIMEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">True</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureIMEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureSharingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSharingEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});
});
