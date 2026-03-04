import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 04', function () {
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
	it('Functional | Create an account with valid values of zimbraMailMinPollingInterval', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">2h</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">2s</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">2m</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">2d</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailMinPollingInterval', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailMinPollingInterval">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPrefForwardIncludeOriginalText', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">includeAsAttachment</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">includeBody</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">includeBodyWithPrefix</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefForwardIncludeOriginalText', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefForwardIncludeOriginalText">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraFeatureSavedSearchesEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureSavedSearchesEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureSavedSearchesEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPrefUseKeyboardShortcuts', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefUseKeyboardShortcuts', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefUseKeyboardShortcuts">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraMailTrashLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">2h</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">2m</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">2s</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">2d</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailTrashLifetime', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailTrashLifetime">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of userPassword', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">VALUE-BLOCKED</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of userPassword', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="userPassword">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraMailIdleSessionTimeout', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">2m</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">2h</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">2s</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">2d</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailIdleSessionTimeout', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailIdleSessionTimeout">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of mail', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of mail', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="mail">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPrefMailItemsPerPage', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">25</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">10000</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefMailItemsPerPage', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailItemsPerPage">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinAge', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">10000</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPasswordMinAge', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMinAge">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPrefContactsPerPage', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">25</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">100</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefContactsPerPage', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefContactsPerPage">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraFeatureAdvancedSearchEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureAdvancedSearchEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureAdvancedSearchEnabled">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Functional | Create an account with valid values of zimbraPrefMailSignatureStyle', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">outlook</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">internet</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefMailSignatureStyle', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">   </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">     </a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">some text</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">-1</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">0</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSignatureStyle">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

			if (res.CreateAccountResponse) {
				const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
	});
});
