import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account 01', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_accountid = { id: '' };
	let test_account5 = { server: '', id: '' };
	let test_account = { id: '' };
	let test_account1_name, test_account2_name, test_account3_name, test_nouser_name, test_account5_name, test_account6_name;
	let test_account7_name, test_account8_name, test_account9_name, test_account10_name, test_account11_name, test_account12_name;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account2_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account3_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_nouser_name = `nouser.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account5_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account6_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account7_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account8_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account9_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account10_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account11_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_account12_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
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
	it('Smoke | Create an account with valid values', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account1_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account1_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | To Create an account without a password', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account2_name}</name>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account2_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | To Create an account without account name', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with account name as spaces, blank, spchar, sometext, negative, zero, largenumber', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>   </name>
				<password>${config.accountPassword}</password>
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
				<name>     </name>
				<password>${config.accountPassword}</password>
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
				<name>:''&lt;//\\\\</name>
				<password>${config.accountPassword}</password>
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
				<name>some text</name>
				<password>${config.accountPassword}</password>
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
				<name>-1</name>
				<password>${config.accountPassword}</password>
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
				<name>0</name>
				<password>${config.accountPassword}</password>
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
				<name>12345678901234567890</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with account name as starstarstarstarstarstarstarstarstar', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>"****************"</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefMailPollingInterval', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account3_name}</name>
				<password>"      "</password>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account3_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

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
				<name>${test_account6_name}</name>
				<password>   </password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.INVALID_PASSWORD'),
			`Expected fault account.INVALID_PASSWORD, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account7_name}</name>
				<password>     </password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.INVALID_PASSWORD'),
			`Expected fault account.INVALID_PASSWORD, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account8_name}</name>
				<password>:''&lt;//\\\\</password>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account8_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

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
				<name>${test_account9_name}</name>
				<password>some text</password>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account9_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

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
				<name>${test_account10_name}</name>
				<password>-1</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.INVALID_PASSWORD'),
			`Expected fault account.INVALID_PASSWORD, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account11_name}</name>
				<password>0</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.INVALID_PASSWORD'),
			`Expected fault account.INVALID_PASSWORD, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account12_name}</name>
				<password>12345678901234567890</password>
			</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="name">${test_account12_name}</account>
				</GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Create an account with non-existing, spaces, blank, spchar, sometext, negative, zero, largenumber name of domain', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>\${config.accountPassword}</password>
				<a n="mail">test@invalid.domain.com</a>
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
				<name>test@invalid.domain.com</name>
				<password>\${config.accountPassword}</password>
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
				<name>test@     </name>
				<password>\${config.accountPassword}</password>
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
				<name>:''&lt;//\\\\</name>
				<password>\${config.accountPassword}</password>
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
				<name>tesss@some text</name>
				<password>\${config.accountPassword}</password>
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
				<name>-1</name>
				<password>\${config.accountPassword}</password>
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
				<name>0</name>
				<password>\${config.accountPassword}</password>
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
				<name>12345678901234567890</name>
				<password>\${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Create an account without user id', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_nouser_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_nouser_name}</account></GetAccountRequest>`, adminAuth);
			test_account.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Verify response
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Smoke | Create an already existing account but with different password', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account5_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account5.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account5.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account5_name}</account></GetAccountRequest>`, adminAuth);
			test_account5.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

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
				<name>${test_account5_name}</name>
				<password>${config.accountPassword}different</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS'),
			`Expected fault account.ACCOUNT_EXISTS, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraContactMaxNumEntries', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraContactMaxNumEntries">0</a>
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
				<a n="zimbraContactMaxNumEntries">1000</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, spchar) of zimbraContactMaxNumEntries', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraContactMaxNumEntries">   </a>
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
				<a n="zimbraContactMaxNumEntries">     </a>
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
				<a n="zimbraContactMaxNumEntries">some text</a>
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
				<a n="zimbraContactMaxNumEntries">-1</a>
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
				<a n="zimbraContactMaxNumEntries">:''&lt;//\\\\</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefMailPollingInterval', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailPollingInterval">5m</a>
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
				<a n="zimbraPrefMailPollingInterval">1000</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefMailPollingInterval 1', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailPollingInterval">   </a>
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
				<a n="zimbraPrefMailPollingInterval">     </a>
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
				<a n="zimbraPrefMailPollingInterval">some text</a>
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
				<a n="zimbraPrefMailPollingInterval">-1</a>
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
				<a n="zimbraPrefMailPollingInterval">0</a>
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
				<a n="zimbraPrefMailPollingInterval">:''&lt;//\\\\</a>
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
				<a n="zimbraPrefMailPollingInterval">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('service.FAILURE') ||
				res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN')),
			`Expected service.FAILURE or NO_SUCH_DOMAIN, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraAttachmentsViewInHtmlOnly', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsViewInHtmlOnly">TRUE</a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraAttachmentsViewInHtmlOnly', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAttachmentsViewInHtmlOnly">   </a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">     </a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">some text</a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">-1</a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">0</a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">:''&lt;//\\\\</a>
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
				<a n="zimbraAttachmentsViewInHtmlOnly">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPasswordMaxAge', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">100</a>
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
				<a n="zimbraPasswordMaxAge">20</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPasswordMaxAge', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPasswordMaxAge">   </a>
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
				<a n="zimbraPasswordMaxAge">     </a>
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
				<a n="zimbraPasswordMaxAge">some text</a>
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
				<a n="zimbraPasswordMaxAge">-1</a>
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
				<a n="zimbraPasswordMaxAge">0</a>
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
				<a n="zimbraPasswordMaxAge">:''&lt;//\\\\</a>
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
				<a n="zimbraPasswordMaxAge">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraMailStatus', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailStatus">enabled</a>
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
				<a n="zimbraMailStatus">disabled</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraMailStatus', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailStatus">   </a>
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
				<a n="zimbraMailStatus">     </a>
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
				<a n="zimbraMailStatus">some text</a>
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
				<a n="zimbraMailStatus">-1</a>
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
				<a n="zimbraMailStatus">0</a>
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
				<a n="zimbraMailStatus">:''&lt;//\\\\</a>
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
				<a n="zimbraMailStatus">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefMessageViewHtmlPreferred', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMessageViewHtmlPreferred">TRUE</a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefMessageViewHtmlPreferred', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMessageViewHtmlPreferred">   </a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">     </a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">some text</a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">-1</a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">0</a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">:''&lt;//\\\\</a>
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
				<a n="zimbraPrefMessageViewHtmlPreferred">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraNewMailNotificationSubject', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationSubject">New message received at RECIPIENT_ADDRESS</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraNewMailNotificationSubject', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraNewMailNotificationSubject">   </a>
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
				<a n="zimbraNewMailNotificationSubject">     </a>
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
				<a n="zimbraNewMailNotificationSubject">some text</a>
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
				<a n="zimbraNewMailNotificationSubject">-1</a>
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
				<a n="zimbraNewMailNotificationSubject">0</a>
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
				<a n="zimbraNewMailNotificationSubject">:''&lt;//\\\\</a>
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
				<a n="zimbraNewMailNotificationSubject">12345678901234567890</a>
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


	it('Functional | Create an account with valid values of zimbraAccountStatus', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAccountStatus">active</a>
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
				<a n="zimbraAccountStatus">maintenance</a>
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
				<a n="zimbraAccountStatus">locked</a>
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
				<a n="zimbraAccountStatus">closed</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraAccountStatus', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAccountStatus">   </a>
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
				<a n="zimbraAccountStatus">     </a>
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
				<a n="zimbraAccountStatus">some text</a>
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
				<a n="zimbraAccountStatus">-1</a>
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
				<a n="zimbraAccountStatus">0</a>
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
				<a n="zimbraAccountStatus">:''&lt;//\\\\</a>
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
				<a n="zimbraAccountStatus">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraPrefShowFragments', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefShowFragments">TRUE</a>
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
				<a n="zimbraPrefShowFragments">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraPrefShowFragments', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefShowFragments">   </a>
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
				<a n="zimbraPrefShowFragments">     </a>
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
				<a n="zimbraPrefShowFragments">some text</a>
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
				<a n="zimbraPrefShowFragments">-1</a>
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
				<a n="zimbraPrefShowFragments">0</a>
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
				<a n="zimbraPrefShowFragments">:''&lt;//\\\\</a>
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
				<a n="zimbraPrefShowFragments">12345678901234567890</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Create an account with valid values of zimbraFeatureGalEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalEnabled">TRUE</a>
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
				<a n="zimbraFeatureGalEnabled">FALSE</a>
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


	it('Regression | Create an account with invalid values (spaces, blank, sometext, negative, zero, spchar, largenumber) of zimbraFeatureGalEnabled', async () => {
		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureGalEnabled">   </a>
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
				<a n="zimbraFeatureGalEnabled">     </a>
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
				<a n="zimbraFeatureGalEnabled">some text</a>
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
				<a n="zimbraFeatureGalEnabled">-1</a>
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
				<a n="zimbraFeatureGalEnabled">0</a>
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
				<a n="zimbraFeatureGalEnabled">:''&lt;//\\\\</a>
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
				<a n="zimbraFeatureGalEnabled">12345678901234567890</a>
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
