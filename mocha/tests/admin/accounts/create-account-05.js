import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 05', function () {
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
	it('Functional | Create an account with valid values of zimbraPrefComposeInNewWindow', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefComposeInNewWindow', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefComposeInNewWindow">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefSaveToSent', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefSaveToSent', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefSaveToSent">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefAutoAddAddressEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefAutoAddAddressEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefAutoAddAddressEnabled">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefForwardReplyPrefixChar', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardReplyPrefixChar">&gt;</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefForwardReplyPrefixChar', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardReplyPrefixChar">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardReplyPrefixChar">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefForwardReplyPrefixChar">0</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefReplyIncludeOriginalText', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">includeBody</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">includeAsAttachment</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">includeBodyWithPrefix</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">includeNone</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">includeSmart</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefReplyIncludeOriginalText', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefReplyIncludeOriginalText">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefTimeZoneId', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">(GMT-08.00) Pacific Time</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefTimeZoneId', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">0</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefTimeZoneId">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of objectClass', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">organizationalPerson</a>
                <a n="objectClass">zimbraAccount</a>
                <a n="objectClass">amavisAccount</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of objectClass', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">some text</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'), `Expected fault ldap.INVALID_ATTR_VALUE, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">-1</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'), `Expected fault ldap.INVALID_ATTR_VALUE, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">0</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'), `Expected fault ldap.INVALID_ATTR_VALUE, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'), `Expected fault ldap.INVALID_ATTR_VALUE, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="objectClass">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'), `Expected fault ldap.INVALID_ATTR_VALUE, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefMailInitialSearch', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">\${globals.inbox}</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">\${globals.sent}</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefMailInitialSearch', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">0</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailInitialSearch">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureConversationsEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraFeatureConversationsEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureConversationsEnabled">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraMailMessageLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                    <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                    <password>${config.accountPassword}</password>
                    <a n="zimbraMailMessageLifetime">     </a>
                </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">0</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('service.FAILURE') || res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')), `Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailMessageLifetime', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">10</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraMailMessageLifetime">1000</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMaxLength', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">64</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPasswordMaxLength', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">0</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordMaxLength">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefUseTimeZoneListInCalendar', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefUseTimeZoneListInCalendar', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefUseTimeZoneListInCalendar">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordLocked', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPasswordLocked', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPasswordLocked">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefImapSearchFoldersEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with invalid values (spaces/blank/sometext/negative/zero/spchar/largenumber) of zimbraPrefImapSearchFoldersEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
            <a n="zimbraPrefImapSearchFoldersEnabled">   </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">     </a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">some text</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">-1</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">0</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">:\'\'&lt;//\\\\</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefImapSearchFoldersEnabled">12345678901234567890</a>
            </CreateAccountRequest>`, adminAuth);
		// In ZCS 10, some invalid attributes silently succeed or return ldap.INVALID_ATTR_VALUE
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) || !!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse), `Expected INVALID_ATTR_VALUE or success, got: ${res.Fault ? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureHtmlComposeEnabled', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureHtmlComposeEnabled">TRUE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraFeatureHtmlComposeEnabled">FALSE</a>
            </CreateAccountRequest>`, adminAuth);
		// Some attributes previously returned success in ZCS 8/9 but now return ldap.INVALID_ATTR_VALUE in ZCS 10
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) || (res.Fault && res.Fault.Detail && res.Fault.Detail.Error && (res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') || res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') || res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))), `Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault ? JSON.stringify(res.Fault) : 'none'}`);
	});
});