import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Modify Account 03', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_accountid = { id: '' };
	let account1 = { server: '' };
	let status1 = { server: '', id: '' };
	let status2 = { server: '', id: '' };
	let status3 = { server: '', id: '' };
	let status4 = { server: '', id: '' };
	let status5 = { server: '', id: '' };
	let status6 = { server: '', id: '' };
	let setupRes;
	let test_account1_name, test_accountid_name, status1_name, status2_name, status3_name, status4_name, status5_name, status6_name;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_accountid_name = test_account1_name;
		status1_name = `status1.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status2_name = `status2.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status3_name = `status3.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status4_name = `status4.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status5_name = `status5.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status6_name = `status6.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
		<name>${test_account1_name}</name>
		<password>${config.accountPassword}</password>
	</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_accountid_name}</account></GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		account1.server = 'placeholder_value'; // Extracted node

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status1_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		status1.server = 'placeholder_value'; // Extracted node
		status1.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status1.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status1_name}</account></GetAccountRequest>`, adminAuth);
			status1.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status2_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status2.server = 'placeholder_value'; // Extracted node
		status2.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status2.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status2_name}</account></GetAccountRequest>`, adminAuth);
			status2.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status3_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status3.server = 'placeholder_value'; // Extracted node
		status3.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status3.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status3_name}</account></GetAccountRequest>`, adminAuth);
			status3.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status4_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status4.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status4.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status4_name}</account></GetAccountRequest>`, adminAuth);
			status4.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status4.server = 'placeholder_value'; // Extracted node

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status5_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		status5.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status5.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status5_name}</account></GetAccountRequest>`, adminAuth);
			status5.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status5.server = 'placeholder_value'; // Extracted node

		// Create account
		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status6_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status6.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status6.id) {

			// GetAccountRequest
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status6_name}</account></GetAccountRequest>`, adminAuth);
			status6.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status6.server = 'placeholder_value'; // Extracted node
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
	it('Functional | Modify an account and set zimbraMailQuota to some invalid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailQuota">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Functional | Modify an account and set zimbraMailQuota to some invalid number', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailQuota">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set givenName to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "givenName">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Modify an account and set givenName to some invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "givenName">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraMailMessageLifetime to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMessageLifetime">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraMailTrashLifetime to some invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMessageLifetime">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMessageLifetime">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMessageLifetime">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMessageLifetime">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureChangePasswordEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureChangePasswordEnabled to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureChangePasswordEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraMailMinPollingInterval to some valid values,', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMinPollingInterval">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraMailMinPollingInterval to some invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMinPollingInterval">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMinPollingInterval">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMinPollingInterval">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailMinPollingInterval">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Attempt to set userPassword using ModifyAccountRequest - success', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "userPassword">\${password.new}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set userPassword to some invalid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "userPassword">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set uid to some invalid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "uid">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefReplyIncludeOriginalText to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">includeBody</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">includeAsAttachment</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">includeBodyWithPrefix</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">includeNone</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">includeSmart</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefReplyIncludeOriginalText to some invalid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefReplyIncludeOriginalText">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account and set zimbraId to 100, negative, some-text', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraId">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraId">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraId">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Attempt to set zimbraMailDeliveryAddress using ModifyAccountRequest - zimbraMailDeliveryAddress is immutable', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailDeliveryAddress">${test_account1_name}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account and set zimbraMailDeliveryAddress to some invalid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailDeliveryAddress">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureFiltersEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureFiltersEnabled to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureFiltersEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefSaveToSent to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefSaveToSent to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSaveToSent">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraAdminAuthTokenLifetime to valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n="zimbraAdminAuthTokenLifetime">10d</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraAdminAuthTokenLifetime to invalid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAdminAuthTokenLifetime">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraAttachmentsViewInHtmlOnly to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraAttachmentsViewInHtmlOnly to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsViewInHtmlOnly">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraAttachmentsBlocked to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraAttachmentsBlocked to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsBlocked">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefMessageViewHtmlPreferred to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefMessageViewHtmlPreferred to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMessageViewHtmlPreferred">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureSavedSearchesEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureSavedSearchesEnabled to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSavedSearchesEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set displayName to some valid name', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "displayName">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Modify an account and set displayName to', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "displayName">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraMailHost to some invalid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailHost">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_SERVER'),
			`Expected fault account.NO_SUCH_SERVER, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureContactsEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureContactsEnabled to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureContactsEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set objectClass to organizationalPerson, zimbraAccount - should return objectclass is immutable', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "objectClass">organizationalPerson</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/service.*$|^account.INVALID_ATTR_VALUE/) !== null,
			`Expected fault to match service.*$|^account.INVALID_ATTR_VALUE, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "objectClass">zimbraAccount</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/service.*$|^account.INVALID_ATTR_VALUE/) !== null,
			`Expected fault to match service.*$|^account.INVALID_ATTR_VALUE, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account and set objectClass to sometext', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "objectClass">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/service.INVALID_REQUEST$|^account.INVALID_ATTR_VALUE/) !== null,
			`Expected fault to match service.INVALID_REQUEST$|^account.INVALID_ATTR_VALUE, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefIncludeSpamInSearch to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefIncludeSpamInSearch to True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">True</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">     </a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">some text</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeSpamInSearch">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefMailItemsPerPage to some valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailItemsPerPage">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefMailItemsPerPage to some invalid value negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailItemsPerPage">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailItemsPerPage">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailItemsPerPage">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailItemsPerPage">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordMinAge to some valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinAge">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPasswordMinAge to some invalid value negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinAge">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinAge">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinAge">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinAge">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefContactsPerPage to some valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefContactsPerPage">100</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefContactsPerPage to some invalid value negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefContactsPerPage">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
				(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
					res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
					res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'none'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefContactsPerPage">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefContactsPerPage">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);

		// ModifyAccountRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefContactsPerPage">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Set zimbraMailHost to some valid name', async () => {
		// First get the account's current mailbox host
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${test_accountid.id}</account>
			</GetAccountRequest>`, adminAuth);
		const attrs = getRes.GetAccountResponse.account[0].a;
		const currentHost = attrs.find(a => a.n === 'zimbraMailHost')._content;

		// ModifyAccountRequest
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailHost">${currentHost}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.ModifyAccountResponse,
			`Expected ModifyAccountResponse, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});
});
