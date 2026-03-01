import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Modify Account 05', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_accountid = { id: '' };
	let setupRes;
	let test_account1_name, test_accountid_name;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;
		test_accountid_name = test_account1_name;

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
	it('Sanity | Modify an account with zimbraPrefGalAutoCompleteEnabled TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGalAutoCompleteEnabled">TRUE</a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">FALSE</a>
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


	it('Sanity | Modify an account with zimbraPrefComposeInNewWindow TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefComposeInNewWindow">TRUE</a>
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
				<a n = "zimbraPrefComposeInNewWindow">FALSE</a>
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


	it('Regression | Modify an account and set zimbraPrefComposeInNewWindow Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefComposeInNewWindow">True</a>
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
				<a n = "zimbraPrefComposeInNewWindow">     </a>
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
				<a n = "zimbraPrefComposeInNewWindow">some text</a>
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
				<a n = "zimbraPrefComposeInNewWindow">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefComposeInNewWindow">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureSharingEnabled TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSharingEnabled">TRUE</a>
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
				<a n = "zimbraFeatureSharingEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraFeatureSharingEnabled Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSharingEnabled">True</a>
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
				<a n = "zimbraFeatureSharingEnabled">     </a>
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
				<a n = "zimbraFeatureSharingEnabled">some text</a>
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
				<a n = "zimbraFeatureSharingEnabled">:''&lt;//\\\\</a>
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
				<a n = "zimbraFeatureSharingEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefCalendarApptReminderWarningTime to Never, 60', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarApptReminderWarningTime">0</a>
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
				<a n = "zimbraPrefCalendarApptReminderWarningTime">60</a>
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
				<a n = "zimbraPrefCalendarApptReminderWarningTime">-1</a>
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


	it('Regression | Modify an account and set zimbraPrefCalendarApptReminderWarningTime Invalid values - , blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarApptReminderWarningTime">     </a>
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
				<a n = "zimbraPrefCalendarApptReminderWarningTime">some text</a>
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
				<a n = "zimbraPrefCalendarApptReminderWarningTime">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefImapSearchFoldersEnabled TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefImapSearchFoldersEnabled">TRUE</a>
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
				<a n = "zimbraPrefImapSearchFoldersEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraPrefImapSearchFoldersEnabled Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefImapSearchFoldersEnabled">True</a>
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
				<a n = "zimbraPrefImapSearchFoldersEnabled">     </a>
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
				<a n = "zimbraPrefImapSearchFoldersEnabled">some text</a>
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
				<a n = "zimbraPrefImapSearchFoldersEnabled">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefImapSearchFoldersEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureHtmlComposeEnabled TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureHtmlComposeEnabled">TRUE</a>
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
				<a n = "zimbraFeatureHtmlComposeEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraFeatureHtmlComposeEnabled Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureHtmlComposeEnabled">True</a>
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
				<a n = "zimbraFeatureHtmlComposeEnabled">     </a>
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
				<a n = "zimbraFeatureHtmlComposeEnabled">some text</a>
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
				<a n = "zimbraFeatureHtmlComposeEnabled">:''&lt;//\\\\</a>
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
				<a n = "zimbraFeatureHtmlComposeEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Attempt to set mail using ModifyAccountRequest - mail is immutable', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "mail">${test_account1_name}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Regression | Modify an account and set mail to some invalid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "mail">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.NO_SUCH_DOMAIN') ||
				res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST')),
			`Expected NO_SUCH_DOMAIN or INVALID_REQUEST, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefShowSearchString TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefShowSearchString">TRUE</a>
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
				<a n = "zimbraPrefShowSearchString">FALSE</a>
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


	it('Regression | Modify an account and set zimbraPrefShowSearchString Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefShowSearchString">True</a>
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
				<a n = "zimbraPrefShowSearchString">     </a>
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
				<a n = "zimbraPrefShowSearchString">some text</a>
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
				<a n = "zimbraPrefShowSearchString">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefShowSearchString">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefSkin to lavender, steel', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSkin">\${theme1}</a>
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
				<a n = "zimbraPrefSkin">\${theme2}</a>
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


	it('Regression | Modify an account and set zimbraPrefSkin to color, spchar, sometext, negative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSkin">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefSkin">some text</a>
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
				<a n = "zimbraPrefSkin">-1</a>
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
				<a n = "zimbraPrefSkin">\${color}</a>
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


	it('Sanity | Modify an account with zimbraPrefHtmlEditorDefaultFontColor to black', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">\${black}</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">\${color1}</a>
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


	it('Regression | Modify an account and set zimbraPrefHtmlEditorDefaultFontColor Invalid values color, number, blank, sometext, special character, neagative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">     </a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">some text</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">-1</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">\${account.number}</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontColor">\${color}</a>
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


	it('Sanity | Modify an account and set zimbraPrefHtmlEditorDefaultFontFamily to Times New Roman, Arial Black', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">\${font1}</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">\${font2}</a>
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


	it('Regression | Modify an account and set zimbraPrefHtmlEditorDefaultFontFamily to blank, spchar, sometext, negative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">some text</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">-1</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontFamily">     </a>
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


	it('Sanity | Modify an account and set zimbraPrefComposeFormat to text, html,', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefComposeFormat">\${text}</a>
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
				<a n = "zimbraPrefComposeFormat">\${html}</a>
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


	it('Regression | Modify an account and set zimbraPrefComposeFormat to blank, spchar, sometext, negative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefComposeFormat">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefComposeFormat">some text</a>
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
				<a n = "zimbraPrefComposeFormat">-1</a>
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
				<a n = "zimbraPrefComposeFormat">     </a>
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


	it('Sanity | Modify an account with zimbraPrefHtmlEditorDefaultFontSize to 8', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">8</a>
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


	it('Regression | Modify an account and set zimbraPrefHtmlEditorDefaultFontSize Invalid values - , blank, sometext, special character, neagative, large number, zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">     </a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">some text</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">-1</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">0</a>
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
				<a n = "zimbraPrefHtmlEditorDefaultFontSize">12345678901234567890</a>
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


	it('Sanity | Modify an account with zimbraPrefTimeZoneId to given timezone', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefTimeZoneId">(GMT-08.00) Pacific Time</a>
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


	it('Regression | Modify an account and set zimbraPrefTimeZoneId Invalid values -spaces , blank, sometext, special character, neagative, zero, largenumber', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefTimeZoneId">     </a>
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
				<a n = "zimbraPrefTimeZoneId">some text</a>
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
				<a n = "zimbraPrefTimeZoneId">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefTimeZoneId">-1</a>
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
				<a n = "zimbraPrefTimeZoneId">   </a>
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
				<a n = "zimbraPrefTimeZoneId">0</a>
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
				<a n = "zimbraPrefTimeZoneId">12345678901234567890</a>
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


	it('Sanity | Modify an account with zimbraPrefCalendarFirstDayOfWeek to 0', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarFirstDayOfWeek">0</a>
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


	it('Regression | Modify an account and set zimbraPrefCalendarFirstDayOfWeek Invalid values - , blank, sometext, special character, neagative, large number,', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarFirstDayOfWeek">     </a>
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
				<a n = "zimbraPrefCalendarFirstDayOfWeek">some text</a>
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
				<a n = "zimbraPrefCalendarFirstDayOfWeek">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefCalendarFirstDayOfWeek">-1</a>
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
				<a n = "zimbraPrefCalendarFirstDayOfWeek">12345678901234567890</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefCalendarInitialView to given view', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarInitialView">workWeek</a>
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


	it('Regression | Modify an account and set zimbraPrefCalendarInitialView Invalid values - , blank, sometext, special character, spaces, negative, zero, largenumber', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarInitialView">     </a>
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
				<a n = "zimbraPrefCalendarInitialView">some text</a>
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
				<a n = "zimbraPrefCalendarInitialView">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefCalendarInitialView">-1</a>
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
				<a n = "zimbraPrefCalendarInitialView">0</a>
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
				<a n = "zimbraPrefCalendarInitialView">12345678901234567890</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});
});
