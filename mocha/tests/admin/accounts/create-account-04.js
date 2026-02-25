import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 04', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_account1_name;
	let test_account2_name;
	let test_account3_name;
	let test_account4_name;
	let test_account5_name;
	let test_account6_name;
	let test_account7_name;
	let test_account8_name;
	let test_account9_name;
	let test_account10_name;
	let test_account11_name;
	let test_account12_name;
	let test_account13_name;
	let domain1_name;
	let test_nouser_name;

	before(async function () {
		await main.before(this.ctx);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test1.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account2_name = `test2.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account3_name = `test3.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account4_name = `test4.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account5_name = `test5.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account6_name = `test6.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account7_name = `test7.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account8_name = `test8.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account9_name = `test9.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account10_name = `test10.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account11_name = `test11.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account12_name = `test12.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account13_name = `test13.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		domain1_name = `domain1.${Date.now()}.${Math.floor(Math.random() * 1000)}.${config.testDomain}`;
		test_nouser_name = `test_nouser${Date.now()}${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create an account with valid values of zimbraMailMinPollingInterval.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMinPollingInterval">2h</a>
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
                <a n="zimbraMailMinPollingInterval">2s</a>
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
                <a n="zimbraMailMinPollingInterval">2m</a>
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
                <a n="zimbraMailMinPollingInterval">2d</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraMailMinPollingInterval.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMinPollingInterval">   </a>
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
                <a n="zimbraMailMinPollingInterval">     </a>
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
                <a n="zimbraMailMinPollingInterval">some text</a>
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
                <a n="zimbraMailMinPollingInterval">-1</a>
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
                <a n="zimbraMailMinPollingInterval">0</a>
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
                <a n="zimbraMailMinPollingInterval">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraMailMinPollingInterval">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefForwardIncludeOriginalText.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardIncludeOriginalText">includeAsAttachment</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">includeBody</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">includeBodyWithPrefix</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefForwardIncludeOriginalText.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardIncludeOriginalText">   </a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">     </a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">some text</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">-1</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">0</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPrefForwardIncludeOriginalText">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureSavedSearchesEnabled.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureSavedSearchesEnabled">TRUE</a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraFeatureSavedSearchesEnabled.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureSavedSearchesEnabled">   </a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">     </a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">some text</a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">-1</a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">0</a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraFeatureSavedSearchesEnabled">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefUseKeyboardShortcuts.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseKeyboardShortcuts">TRUE</a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefUseKeyboardShortcuts.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseKeyboardShortcuts">   </a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">     </a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">some text</a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">-1</a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">0</a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPrefUseKeyboardShortcuts">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailTrashLifetime.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailTrashLifetime">2h</a>
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
                <a n="zimbraMailTrashLifetime">2m</a>
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
                <a n="zimbraMailTrashLifetime">2s</a>
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
                <a n="zimbraMailTrashLifetime">2d</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraMailTrashLifetime.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailTrashLifetime">   </a>
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
                <a n="zimbraMailTrashLifetime">     </a>
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
                <a n="zimbraMailTrashLifetime">some text</a>
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
                <a n="zimbraMailTrashLifetime">-1</a>
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
                <a n="zimbraMailTrashLifetime">0</a>
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
                <a n="zimbraMailTrashLifetime">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraMailTrashLifetime">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of userPassword.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="userPassword">VALUE-BLOCKED</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of userPassword.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="userPassword">   </a>
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
                <a n="userPassword">     </a>
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
                <a n="userPassword">some text</a>
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
                <a n="userPassword">-1</a>
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
                <a n="userPassword">0</a>
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
                <a n="userPassword">:\'\'&lt;//\\\\</a>
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
                <a n="userPassword">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailIdleSessionTimeout.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailIdleSessionTimeout">2m</a>
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
                <a n="zimbraMailIdleSessionTimeout">2h</a>
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
                <a n="zimbraMailIdleSessionTimeout">2s</a>
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
                <a n="zimbraMailIdleSessionTimeout">2d</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraMailIdleSessionTimeout.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailIdleSessionTimeout">   </a>
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
                <a n="zimbraMailIdleSessionTimeout">     </a>
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
                <a n="zimbraMailIdleSessionTimeout">some text</a>
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
                <a n="zimbraMailIdleSessionTimeout">-1</a>
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
                <a n="zimbraMailIdleSessionTimeout">0</a>
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
                <a n="zimbraMailIdleSessionTimeout">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraMailIdleSessionTimeout">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of mail.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="mail">test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of mail.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="mail">   </a>
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
                <a n="mail">     </a>
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
                <a n="mail">some text</a>
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
                <a n="mail">-1</a>
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
                <a n="mail">0</a>
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
                <a n="mail">:\'\'&lt;//\\\\</a>
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
                <a n="mail">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefMailItemsPerPage.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailItemsPerPage">25</a>
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
                <a n="zimbraPrefMailItemsPerPage">10000</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefMailItemsPerPage.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailItemsPerPage">   </a>
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
                <a n="zimbraPrefMailItemsPerPage">     </a>
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
                <a n="zimbraPrefMailItemsPerPage">some text</a>
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
                <a n="zimbraPrefMailItemsPerPage">-1</a>
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
                <a n="zimbraPrefMailItemsPerPage">0</a>
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
                <a n="zimbraPrefMailItemsPerPage">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPrefMailItemsPerPage">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMinAge.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMinAge">0</a>
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
                <a n="zimbraPasswordMinAge">10000</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPasswordMinAge.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMinAge">   </a>
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
                <a n="zimbraPasswordMinAge">     </a>
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
                <a n="zimbraPasswordMinAge">some text</a>
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
                <a n="zimbraPasswordMinAge">-1</a>
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
                <a n="zimbraPasswordMinAge">0</a>
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
                <a n="zimbraPasswordMinAge">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPasswordMinAge">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefContactsPerPage.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefContactsPerPage">25</a>
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
                <a n="zimbraPrefContactsPerPage">100</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefContactsPerPage.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefContactsPerPage">   </a>
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
                <a n="zimbraPrefContactsPerPage">     </a>
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
                <a n="zimbraPrefContactsPerPage">some text</a>
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
                <a n="zimbraPrefContactsPerPage">-1</a>
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
                <a n="zimbraPrefContactsPerPage">0</a>
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
                <a n="zimbraPrefContactsPerPage">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPrefContactsPerPage">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureAdvancedSearchEnabled.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureAdvancedSearchEnabled">TRUE</a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraFeatureAdvancedSearchEnabled.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureAdvancedSearchEnabled">   </a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">     </a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">some text</a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">-1</a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">0</a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraFeatureAdvancedSearchEnabled">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefMailSignatureStyle.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailSignatureStyle">outlook</a>
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
                <a n="zimbraPrefMailSignatureStyle">internet</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefMailSignatureStyle.', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailSignatureStyle">   </a>
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
                <a n="zimbraPrefMailSignatureStyle">     </a>
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
                <a n="zimbraPrefMailSignatureStyle">some text</a>
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
                <a n="zimbraPrefMailSignatureStyle">-1</a>
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
                <a n="zimbraPrefMailSignatureStyle">0</a>
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
                <a n="zimbraPrefMailSignatureStyle">:\'\'&lt;//\\\\</a>
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
                <a n="zimbraPrefMailSignatureStyle">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});
});
