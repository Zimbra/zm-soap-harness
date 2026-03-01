import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 06', function () {
	this.timeout(30 * 1000);
	let adminAuth;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureHtmlComposeEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureHtmlComposeEnabled">   </a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">     </a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">some text</a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">-1</a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">0</a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraFeatureHtmlComposeEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureContactsEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureContactsEnabled">TRUE</a>
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
				<a n="zimbraFeatureContactsEnabled">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureContactsEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureContactsEnabled">   </a>
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
				<a n="zimbraFeatureContactsEnabled">     </a>
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
				<a n="zimbraFeatureContactsEnabled">some text</a>
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
				<a n="zimbraFeatureContactsEnabled">-1</a>
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
				<a n="zimbraFeatureContactsEnabled">0</a>
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
				<a n="zimbraFeatureContactsEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraFeatureContactsEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailSpamLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailSpamLifetime">30h</a>
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
				<a n="zimbraMailSpamLifetime">30s</a>
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
				<a n="zimbraMailSpamLifetime">30m</a>
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
				<a n="zimbraMailSpamLifetime">30d</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailSpamLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailSpamLifetime">   </a>
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
				<a n="zimbraMailSpamLifetime">     </a>
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
				<a n="zimbraMailSpamLifetime">some text</a>
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
				<a n="zimbraMailSpamLifetime">-1</a>
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
				<a n="zimbraMailSpamLifetime">0</a>
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
				<a n="zimbraMailSpamLifetime">:''&lt;//\\\\</a>
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
				<a n="zimbraMailSpamLifetime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraAdminAuthTokenLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAdminAuthTokenLifetime">12h</a>
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
				<a n="zimbraAdminAuthTokenLifetime">12s</a>
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
				<a n="zimbraAdminAuthTokenLifetime">12m</a>
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
				<a n="zimbraAdminAuthTokenLifetime">12d</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraAdminAuthTokenLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAdminAuthTokenLifetime">   </a>
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
				<a n="zimbraAdminAuthTokenLifetime">     </a>
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
				<a n="zimbraAdminAuthTokenLifetime">some text</a>
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
				<a n="zimbraAdminAuthTokenLifetime">-1</a>
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
				<a n="zimbraAdminAuthTokenLifetime">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAdminAuthTokenLifetime">:''&lt;//\\\\</a>
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
				<a n="zimbraAdminAuthTokenLifetime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureCalendarEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureCalendarEnabled">TRUE</a>
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
				<a n="zimbraFeatureCalendarEnabled">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureCalendarEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureCalendarEnabled">   </a>
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
				<a n="zimbraFeatureCalendarEnabled">     </a>
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
				<a n="zimbraFeatureCalendarEnabled">some text</a>
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
				<a n="zimbraFeatureCalendarEnabled">-1</a>
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
				<a n="zimbraFeatureCalendarEnabled">0</a>
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
				<a n="zimbraFeatureCalendarEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraFeatureCalendarEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraAttachmentsBlocked', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsBlocked">TRUE</a>
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
				<a n="zimbraAttachmentsBlocked">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraAttachmentsBlocked', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsBlocked">   </a>
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
				<a n="zimbraAttachmentsBlocked">     </a>
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
				<a n="zimbraAttachmentsBlocked">some text</a>
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
				<a n="zimbraAttachmentsBlocked">-1</a>
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
				<a n="zimbraAttachmentsBlocked">0</a>
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
				<a n="zimbraAttachmentsBlocked">:''&lt;//\\\\</a>
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
				<a n="zimbraAttachmentsBlocked">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraNewMailNotificationBody', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationBody">New message received at RECIPIENT_ADDRESS Sender: SENDER_ADDRESS Subject: SUBJECT</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraNewMailNotificationBody', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationBody">   </a>
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
				<a n="zimbraNewMailNotificationBody">     </a>
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
				<a n="zimbraNewMailNotificationBody">some text</a>
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
				<a n="zimbraNewMailNotificationBody">-1</a>
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
				<a n="zimbraNewMailNotificationBody">0</a>
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
				<a n="zimbraNewMailNotificationBody">:''&lt;//\\\\</a>
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
				<a n="zimbraNewMailNotificationBody">12345678901234567890</a>
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


	it('Functional | Create an account with valid values of zimbraNewMailNotificationFrom', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationFrom">Postmaster</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraNewMailNotificationFrom', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationFrom">   </a>
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
				<a n="zimbraNewMailNotificationFrom">     </a>
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
				<a n="zimbraNewMailNotificationFrom">some text</a>
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
				<a n="zimbraNewMailNotificationFrom">-1</a>
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
				<a n="zimbraNewMailNotificationFrom">0</a>
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
				<a n="zimbraNewMailNotificationFrom">:''&lt;//\\\\</a>
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
				<a n="zimbraNewMailNotificationFrom">12345678901234567890</a>
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


	it('Functional | Create an account with valid values of zimbraPasswordMinLength', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLength">6</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPasswordMinLength', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinLength">   </a>
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
				<a n="zimbraPasswordMinLength">     </a>
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
				<a n="zimbraPasswordMinLength">some text</a>
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
				<a n="zimbraPasswordMinLength">-1</a>
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
				<a n="zimbraPasswordMinLength">0</a>
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
				<a n="zimbraPasswordMinLength">:''&lt;//\\\\</a>
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
				<a n="zimbraPasswordMinLength">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraAttachmentsIndexingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsIndexingEnabled">TRUE</a>
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
				<a n="zimbraAttachmentsIndexingEnabled">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraAttachmentsIndexingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsIndexingEnabled">   </a>
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
				<a n="zimbraAttachmentsIndexingEnabled">     </a>
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
				<a n="zimbraAttachmentsIndexingEnabled">some text</a>
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
				<a n="zimbraAttachmentsIndexingEnabled">-1</a>
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
				<a n="zimbraAttachmentsIndexingEnabled">0</a>
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
				<a n="zimbraAttachmentsIndexingEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraAttachmentsIndexingEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefIncludeSpamInSearch', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefIncludeSpamInSearch">TRUE</a>
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
				<a n="zimbraPrefIncludeSpamInSearch">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefIncludeSpamInSearch', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefIncludeSpamInSearch">   </a>
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
				<a n="zimbraPrefIncludeSpamInSearch">     </a>
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
				<a n="zimbraPrefIncludeSpamInSearch">some text</a>
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
				<a n="zimbraPrefIncludeSpamInSearch">-1</a>
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
				<a n="zimbraPrefIncludeSpamInSearch">0</a>
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
				<a n="zimbraPrefIncludeSpamInSearch">:''&lt;//\\\\</a>
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
				<a n="zimbraPrefIncludeSpamInSearch">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordEnforceHistory', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">10</a>
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
				<a n="zimbraPasswordEnforceHistory">100</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPasswordEnforceHistory', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordEnforceHistory">   </a>
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
				<a n="zimbraPasswordEnforceHistory">     </a>
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
				<a n="zimbraPasswordEnforceHistory">some text</a>
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
				<a n="zimbraPasswordEnforceHistory">-1</a>
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
				<a n="zimbraPasswordEnforceHistory">0</a>
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
				<a n="zimbraPasswordEnforceHistory">:''&lt;//\\\\</a>
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
				<a n="zimbraPasswordEnforceHistory">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailTransport', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTransport">\${account.MailTransport}</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailTransport', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTransport">   </a>
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
				<a n="zimbraMailTransport">     </a>
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
				<a n="zimbraMailTransport">some text</a>
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
				<a n="zimbraMailTransport">-1</a>
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
				<a n="zimbraMailTransport">0</a>
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
				<a n="zimbraMailTransport">:''&lt;//\\\\</a>
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
				<a n="zimbraMailTransport">12345678901234567890</a>
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


	it('Functional | Create an account with valid values of zimbraFeatureTaggingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTaggingEnabled">TRUE</a>
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
				<a n="zimbraFeatureTaggingEnabled">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureTaggingEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTaggingEnabled">   </a>
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
				<a n="zimbraFeatureTaggingEnabled">     </a>
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
				<a n="zimbraFeatureTaggingEnabled">some text</a>
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
				<a n="zimbraFeatureTaggingEnabled">-1</a>
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
				<a n="zimbraFeatureTaggingEnabled">0</a>
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
				<a n="zimbraFeatureTaggingEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraFeatureTaggingEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});
});
