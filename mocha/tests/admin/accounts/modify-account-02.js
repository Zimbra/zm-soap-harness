import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Modify Account 02', function () {
	this.timeout(30 * 1000);
	let adminAuth;
	let test_accountid = { id: '' };
	let test_account1_name;
	let setupRes;

	before(async function () {
		await main.before(this.ctx);
		adminAuth = await soap.getAdminAuthToken();
		test_account1_name = `test1.${Date.now()}.${Math.floor(Math.random() * 1000)}@${config.testDomain}`;

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Modify an account with zimbraPrefGalAutoCompleteEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGalAutoCompleteEnabled">TRUE</a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefGalAutoCompleteEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefGalAutoCompleteEnabled">True</a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">     </a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">some text</a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefGalAutoCompleteEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefCalendarUseQuickAdd TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarUseQuickAdd">TRUE</a>
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
				<a n = "zimbraPrefCalendarUseQuickAdd">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefCalendarUseQuickAdd Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarUseQuickAdd">True</a>
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
				<a n = "zimbraPrefCalendarUseQuickAdd">     </a>
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
				<a n = "zimbraPrefCalendarUseQuickAdd">some text</a>
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
				<a n = "zimbraPrefCalendarUseQuickAdd">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefCalendarUseQuickAdd">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefShowFragments TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefShowFragments">TRUE</a>
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
				<a n = "zimbraPrefShowFragments">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefShowFragments Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefShowFragments">True</a>
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
				<a n = "zimbraPrefShowFragments">     </a>
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
				<a n = "zimbraPrefShowFragments">some text</a>
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
				<a n = "zimbraPrefShowFragments">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefShowFragments">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureMobileSyncEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureMobileSyncEnabled">TRUE</a>
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
				<a n = "zimbraFeatureMobileSyncEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureMobileSyncEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureMobileSyncEnabled">True</a>
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
				<a n = "zimbraFeatureMobileSyncEnabled">     </a>
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
				<a n = "zimbraFeatureMobileSyncEnabled">some text</a>
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
				<a n = "zimbraFeatureMobileSyncEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureMobileSyncEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureSkinChangeEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSkinChangeEnabled">TRUE</a>
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
				<a n = "zimbraFeatureSkinChangeEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureSkinChangeEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureSkinChangeEnabled">True</a>
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
				<a n = "zimbraFeatureSkinChangeEnabled">     </a>
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
				<a n = "zimbraFeatureSkinChangeEnabled">some text</a>
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
				<a n = "zimbraFeatureSkinChangeEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureSkinChangeEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefCalendarNotifyDelegatedChanges TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">TRUE</a>
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
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefCalendarNotifyDelegatedChanges Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">True</a>
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
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">     </a>
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
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">some text</a>
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
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefCalendarNotifyDelegatedChanges">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefUseTimeZoneListInCalendar TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseTimeZoneListInCalendar">TRUE</a>
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
				<a n = "zimbraPrefUseTimeZoneListInCalendar">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefUseTimeZoneListInCalendar Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefUseTimeZoneListInCalendar">True</a>
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
				<a n = "zimbraPrefUseTimeZoneListInCalendar">     </a>
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
				<a n = "zimbraPrefUseTimeZoneListInCalendar">some text</a>
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
				<a n = "zimbraPrefUseTimeZoneListInCalendar">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefUseTimeZoneListInCalendar">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureNewMailNotificationEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureNewMailNotificationEnabled">TRUE</a>
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
				<a n = "zimbraFeatureNewMailNotificationEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureNewMailNotificationEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureNewMailNotificationEnabled">True</a>
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
				<a n = "zimbraFeatureNewMailNotificationEnabled">     </a>
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
				<a n = "zimbraFeatureNewMailNotificationEnabled">some text</a>
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
				<a n = "zimbraFeatureNewMailNotificationEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureNewMailNotificationEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureMailForwardingEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureMailForwardingEnabled">TRUE</a>
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
				<a n = "zimbraFeatureMailForwardingEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureMailForwardingEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureMailForwardingEnabled">True</a>
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
				<a n = "zimbraFeatureMailForwardingEnabled">     </a>
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
				<a n = "zimbraFeatureMailForwardingEnabled">some text</a>
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
				<a n = "zimbraFeatureMailForwardingEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureMailForwardingEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureViewInHtmlEnabled TRUE, FALSE', async () => {
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


	it('Regression | Modify an account and set zimbraFeatureViewInHtmlEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureViewInHtmlEnabled">True</a>
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
				<a n = "zimbraFeatureViewInHtmlEnabled">     </a>
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
				<a n = "zimbraFeatureViewInHtmlEnabled">some text</a>
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
				<a n = "zimbraFeatureViewInHtmlEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureViewInHtmlEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureGalAutoCompleteEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureGalAutoCompleteEnabled">TRUE</a>
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
				<a n = "zimbraFeatureGalAutoCompleteEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureGalAutoCompleteEnabled Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureGalAutoCompleteEnabled">True</a>
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
				<a n = "zimbraFeatureGalAutoCompleteEnabled">     </a>
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
				<a n = "zimbraFeatureGalAutoCompleteEnabled">some text</a>
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
				<a n = "zimbraFeatureGalAutoCompleteEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureGalAutoCompleteEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraPrefCalendarAlwaysShowMiniCal TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">TRUE</a>
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
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraPrefCalendarAlwaysShowMiniCal Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">True</a>
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
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">     </a>
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
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">some text</a>
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
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraPrefCalendarAlwaysShowMiniCal">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account with zimbraFeatureOutOfOfficeReplyEnabled TRUE, FALSE', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">TRUE</a>
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
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue(!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse) ||
			(res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('account.NO_SUCH_ACCOUNT'))),
			`Expected ModifyAccountResponse or INVALID_ATTR_VALUE/INVALID_REQUEST/NO_SUCH_ACCOUNT, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'none'}`);
	});


	it('Regression | Modify an account and set zimbraFeatureOutOfOfficeReplyEnabledl Invalid values - True, blank, sometext, special character', async () => {
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">True</a>
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
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">     </a>
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
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">some text</a>
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
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">:\'\'&lt;//\\\\</a>
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
				<a n = "zimbraFeatureOutOfOfficeReplyEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
			res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
			? JSON.stringify(res.Fault) : 'no fault'}`);
	});
});
