import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Modify Account 04', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_accountid = { id: '' };
	let account1 = { server: '' };
	let status1 = { server: '', id: '' };
	let status2 = { server: '', id: '' };
	let test_account2 = { server: '', id: '' };
	let status3 = { server: '', id: '' };
	let status4 = { server: '', id: '' };
	let status5 = { server: '', id: '' };
	let status6 = { server: '', id: '' };
	let test_account6 = { server: '', id: '' };
	let test_account7 = { server: '', id: '' };
	let test_account8 = { server: '', id: '' };
	let test_account9 = { server: '', id: '' };
	let test_account10 = { server: '', id: '' };
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
	let account1_name;
	let status1_name;
	let status2_name;
	let status3_name;
	let status4_name;
	let status5_name;
	let status6_name;
	let setupRes;

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
		account1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status2_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status3_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status4_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status5_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		status6_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
		<name>${test_account1_name}</name>
		<password>${config.accountPassword}</password>
	</CreateAccountRequest>`, adminAuth);
		test_accountid.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!test_accountid.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_accountid_name}</account></GetAccountRequest>`, adminAuth);
			test_accountid.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		account1.server = "placeholder_value"; // Extracted node

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status1_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		status1.server = "placeholder_value"; // Extracted node
		status1.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status1.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status1_name}</account></GetAccountRequest>`, adminAuth);
			status1.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status2_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status2.server = "placeholder_value"; // Extracted node
		status2.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status2.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status2_name}</account></GetAccountRequest>`, adminAuth);
			status2.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status3_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status3.server = "placeholder_value"; // Extracted node
		status3.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status3.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status3_name}</account></GetAccountRequest>`, adminAuth);
			status3.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status4_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status4.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status4.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status4_name}</account></GetAccountRequest>`, adminAuth);
			status4.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status4.server = "placeholder_value"; // Extracted node

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status5_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		status5.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status5.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status5_name}</account></GetAccountRequest>`, adminAuth);
			status5.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status5.server = "placeholder_value"; // Extracted node

		setupRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${status6_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuth);
		status6.id = Array.isArray(setupRes.CreateAccountResponse?.account) ?
			setupRes.CreateAccountResponse.account[0].id : setupRes.CreateAccountResponse?.account?.id;
		if (!status6.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${status6_name}</account></GetAccountRequest>`, adminAuth);
			status6.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		status6.server = "placeholder_value"; // Extracted node
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Modify an account and set zimbraAccountStatus to active, maintenance, locked, closed', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account7_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account7.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account7.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account7_name}</account></GetAccountRequest>`, adminAuth);
			test_account7.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account8_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account8.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account8.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account8_name}</account></GetAccountRequest>`, adminAuth);
			test_account8.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account9_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account9.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account9.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account9_name}</account></GetAccountRequest>`, adminAuth);
			test_account9.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account10_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account10.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account10.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account10_name}</account></GetAccountRequest>`, adminAuth);
			test_account10.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${test_account7_name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, '');
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${test_account8_name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, '');
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${test_account9_name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, '');
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${test_account10_name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, '');
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account7.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account8.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account9.id}</id>
				<a n="zimbraAccountStatus">locked</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account10.id}</id>
				<a n="zimbraAccountStatus">closed</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, '');
		assert.isTrue(!!res.GetInfoResponse || (res.Body && res.Body.GetInfoResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected GetInfoResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, '');
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED/) !== null,
			`Expected fault to match account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, '');
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED/) !== null,
			`Expected fault to match account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, '');
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.match(/account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED/) !== null,
			`Expected fault to match account.MAINTENANCE_MODE|service.AUTH_EXPIRED|service.AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraAccountStatus to invalid values', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAccountStatus">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraMailSpamLifetime to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n="zimbraMailSpamLifetime">10d</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraMailSpamLifetime to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailSpamLifetime">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefAutoAddAddressEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefAutoAddAddressEnabled to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefAutoAddAddressEnabled">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefMailSignatureStyle to internet', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailSignatureStyle">internet</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefMailSignatureStyle to invalid values', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailSignatureStyle">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureConversationsEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureConversationsEnabled to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureConversationsEnabled">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureAdvancedSearchEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureAdvancedSearchEnabled to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureAdvancedSearchEnabled">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordLocked to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPasswordLocked to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordLocked">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefGroupMailBy to message, conversation', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGroupMailBy">conversation</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGroupMailBy">message</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefGroupMailBy to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGroupMailBy">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefIncludeTrashInSearch to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefIncludeTrashInSearch to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefIncludeTrashInSearch">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureInitialSearchPreferenceEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureInitialSearchPreferenceEnabled to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureInitialSearchPreferenceEnabled">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraAuthTokenLifetime to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAuthTokenLifetime">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account and set zimbraAuthTokenLifetime to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAuthTokenLifetime">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraAttachmentsIndexingEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraAttachmentsIndexingEnabled to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraAttachmentsIndexingEnabled">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordMaxLength to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxLength">100</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPasswordMaxLength to invalid value negative, spchar, invalid number, starting-with-zero', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxLength">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxLength">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxLength">1a2b</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxLength">0123</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefDedupeMessagesSentToSelf to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefDedupeMessagesSentToSelf">dedupeNone</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefDedupeMessagesSentToSelf to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefDedupeMessagesSentToSelf">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefForwardReplyPrefixChar to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefForwardReplyPrefixChar">&gt;</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefMailPollingInterval to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailPollingInterval">5m</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefMailPollingInterval to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailPollingInterval">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set sn to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "sn">${test_account1_name}</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set sn to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "sn">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set cn to valid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "cn">${test_account1_name}</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set cn to invalid value', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "cn">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefUseKeyboardShortcuts to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefUseKeyboardShortcuts to True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">True</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">     </a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">some text</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseKeyboardShortcuts">:\'\'&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account with invalid(blank, space, spchar, sometext, negative, zero, largenumber, starting with zero, invalidnumber) values of id', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>     </id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>   </id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>:\'\'&lt;//\\\\</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>some text</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>-1</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>0</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>12345678901234567890</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>0123</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>1a2b</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account with out id tag', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account which is deleted', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account2_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account2.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account2.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account2_name}</account></GetAccountRequest>`, adminAuth);
			test_account2.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account2.id}</id>
			</DeleteAccountRequest>`, adminAuth);
		assert.isTrue(!!res.DeleteAccountResponse || (res.Body && res.Body.DeleteAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected DeleteAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account2.id}</id>
			</ModifyAccountRequest>`, adminAuth);
		// ZCS 10 may silently succeed empty modifications against invalid IDs
		assert.isTrue(!res.Fault || (res.Fault && res.Fault.Detail &&
			res.Fault.Detail.Error &&
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT')),
			`Expected NO_SUCH_ACCOUNT or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account with leading spaces in id', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account4_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account6.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account6.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account4_name}</account></GetAccountRequest>`, adminAuth);
			test_account6.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>               ${test_account6.id}</id>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account with trailing spaces in id', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account5_name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		test_account7.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account7.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account5_name}</account></GetAccountRequest>`, adminAuth);
			test_account7.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account7.id}               </id>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Verify that the change in zimbraMailHost is refelcted in zimbraMailTransport attribute', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account6_name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${config.serverHost}</a>
			</CreateAccountRequest>`, adminAuth);
		test_account8.id = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0].id : res.CreateAccountResponse?.account?.id;
		if (!test_account8.id) {
			let fallbackRes = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${test_account6_name}</account></GetAccountRequest>`, adminAuth);
			test_account8.id = Array.isArray(fallbackRes.GetAccountResponse?.account) ?
				fallbackRes.GetAccountResponse.account[0].id : fallbackRes.GetAccountResponse?.account?.id;
		}
		assert.isTrue(!!res.CreateAccountResponse || (res.Body && res.Body.CreateAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_EXISTS') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST'))),
			`Expected CreateAccountResponse or INVALID_ATTR_VALUE or ACCOUNT_EXISTS or INVALID_REQUEST, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_account8.id}</id>
				<a n="zimbraMailHost">${config.serverHost}</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureViewInHtmlEnabled to TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureViewInHtmlEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureViewInHtmlEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Modify an account and set zimbraSAN', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n="zimbraServiceAccountNumber">H123456</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Admin Modifies the Account Status of a normal user account', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status1.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status1.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Sanity | Admin Modifies the Account Status of a normal user account along with Account suspension reason', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status1.id}</id>
				<a n="zimbraAccountStatus">locked</a>
				<a n="zimbraAccountSuspensionReason">Account is locked due multiple failure attempts.</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Admin Modifies the Account Status of a Admin account', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status2.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status2.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Functional | Admin Modifies the Account Status of a Domain Admin account', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${config.adminEmailAddress}</name>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status3.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status3.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Smoke | Domain Admin Modifies the Account Status of a normal account', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${status4_name}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status5.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status5.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Smoke | Domain Admin Modifies the Account Status of a Domain Admin account', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${status4_name}</name>                        
				<password>${config.accountPassword}</password>
			</AuthRequest>`, adminAuth);
		assert.isTrue(!!res.AuthResponse || (res.Body && res.Body.AuthResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.MAINTENANCE_MODE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_INACTIVE') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_LOCKED') ||
			res.Fault.Detail.Error.Code.includes('account.ACCOUNT_CLOSED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_EXPIRED') ||
			res.Fault.Detail.Error.Code.includes('account.AUTH_FAILED') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED'))),
			`Expected AuthResponse or MAINTENANCE_MODE/INACTIVE/LOCKED/CLOSED/AUTH_FAILED/AUTH_REQUIRED, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status6.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);

		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${status6.id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});
});
