import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Modify Account 01', function () {
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
		await main.before(this.ctx);
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Modify an account with all valid details', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
			<id>${test_accountid.id}</id>
				<a n="zimbraFeatureCalendarEnabled">TRUE</a>
				<a n="zimbraPasswordModifiedTime">20050529053842Z</a>
				<a n="zimbraPrefMailInitialSearch">in:inbox</a>
				<a n="zimbraPop3Enabled">TRUE</a>
				<a n="zimbraImapEnabled">TRUE</a>
				<a n="zimbraContactMaxNumEntries">0</a>
				<a n="zimbraNewMailNotificationBody">New message received at \${RECIPIENT_ADDRESS}.\${NEWLINE}Sender: \${SENDER_ADDRESS}\${NEWLINE}Subject: \${SUBJECT}</a>
				<a n="zimbraFeatureGalEnabled">TRUE</a>
				<a n="zimbraPrefSentMailFolder">sent</a>
				<a n="zimbraPasswordMaxAge">0</a>
				<a n="zimbraNewMailNotificationSubject">New message received at \${RECIPIENT_ADDRESS}</a>
				<a n="zimbraPasswordEnforceHistory">0</a>
				<a n="zimbraMailStatus">enabled</a>
				<a n="zimbraPasswordMinLength">6</a>
				<a n="zimbraMailTrashLifetime">7d</a>
				<a n="zimbraMailIdleSessionTimeout">0</a>
				<a n="zimbraFeatureTaggingEnabled">TRUE</a>
				<a n="zimbraMailQuota">0</a>
				<a n="givenName">yttyy</a>
				<a n="zimbraMailMessageLifetime">0</a>
				<a n="zimbraFeatureChangePasswordEnabled">TRUE</a>
				<a n="zimbraMailMinPollingInterval">2m</a>
				<a n="zimbraPrefReplyIncludeOriginalText">includeBody</a>
				<a n="zimbraPrefForwardIncludeOriginalText">includeBody</a>
				<a n="zimbraFeatureFiltersEnabled">TRUE</a>
				<a n="zimbraPrefSaveToSent">TRUE</a>
				<a n="zimbraAdminAuthTokenLifetime">12h</a>
				<a n="zimbraAttachmentsViewInHtmlOnly">FALSE</a>
				<a n="zimbraAttachmentsBlocked">FALSE</a>
				<a n="zimbraPrefMessageViewHtmlPreferred">TRUE</a>
				<a n="zimbraFeatureSavedSearchesEnabled">TRUE</a>
				<a n="displayName">yttyy admin</a>
				<a n="zimbraFeatureContactsEnabled">TRUE</a>				
				<a n="zimbraPrefIncludeSpamInSearch">FALSE</a>
				<a n="zimbraPrefMailItemsPerPage">25</a>
				<a n="zimbraPasswordMinAge">0</a>
				<a n="zimbraPrefContactsPerPage">25</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="zimbraMailSpamLifetime">7d</a>
				<a n="zimbraPrefAutoAddAddressEnabled">FALSE</a>
				<a n="zimbraPrefMailSignatureStyle">internet</a>
				<a n="zimbraFeatureConversationsEnabled">TRUE</a>
				<a n="zimbraFeatureAdvancedSearchEnabled">TRUE</a>
				<a n="zimbraPasswordLocked">FALSE</a>
				<a n="zimbraPrefGroupMailBy">conversation</a>
				<a n="zimbraPrefIncludeTrashInSearch">FALSE</a>
				<a n="zimbraFeatureInitialSearchPreferenceEnabled">TRUE</a>
				<a n="zimbraAuthTokenLifetime">12h</a>
				<a n="zimbraAttachmentsIndexingEnabled">TRUE</a>
				<a n="zimbraPasswordMaxLength">64</a>
				<a n="zimbraPrefDedupeMessagesSentToSelf">dedupeNone</a>
				<a n="zimbraPrefForwardReplyPrefixChar">&gt;</a>
				<a n="zimbraPrefMailPollingInterval">5m</a>
				<a n="sn">test.1117345120686.1</a>
				<a n="cn">test.1117345120686.1</a>
				<a n="zimbraPrefUseKeyboardShortcuts">FALSE</a>
				<a n="zimbraNewMailNotificationFrom">Notification &lt;notify@\${RECIPIENT_DOMAIN}&gt;</a>
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


	it('Sanity | Modify an account with zimbraFeatureCalendarEnabled TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureCalendarEnabled">TRUE</a>
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
				<a n = "zimbraFeatureCalendarEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraFeatureCalendarEnabled Invalid values - True, blank, sometext, special character 1', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureCalendarEnabled">True</a>
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
				<a n = "zimbraFeatureCalendarEnabled">     </a>
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
				<a n = "zimbraFeatureCalendarEnabled">some text</a>
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
				<a n = "zimbraFeatureCalendarEnabled">:''&lt;//\\\\</a>
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
				<a n = "zimbraFeatureCalendarEnabled">-1</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordModifiedTime to some valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordModifiedTime">20050601053842Z</a>
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


	it('Regression | Modify an account and set zimbraPasswordModifiedTime to invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordModifiedTime">-1</a>
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
				<a n = "zimbraPasswordModifiedTime">:''&lt;//\\\\</a>
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
				<a n = "zimbraPasswordModifiedTime">1a2b</a>
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
				<a n = "zimbraPasswordModifiedTime">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefMailInitialSearch to inbox, sent, trash,', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailInitialSearch">\${inbox}</a>
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
				<a n = "zimbraPrefMailInitialSearch">\${sent}</a>
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
				<a n = "zimbraPrefMailInitialSearch">\${trash}</a>
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


	it('Regression | Modify an account and set zimbraPrefMailInitialSearch to contacts, spchar, sometext, negative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefMailInitialSearch">in:contacts</a>
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
				<a n = "zimbraPrefMailInitialSearch">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefMailInitialSearch">some text</a>
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
				<a n = "zimbraPrefMailInitialSearch">-1</a>
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


	it('Sanity | Modify an account and set zimbraPop3Enabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPop3Enabled">TRUE</a>
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
				<a n = "zimbraPop3Enabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraPop3Enabled Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPop3Enabled">True</a>
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
				<a n = "zimbraPop3Enabled">{account.sometext}</a>
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
				<a n = "zimbraPop3Enabled">{account.spchar}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraImapEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraImapEnabled">TRUE</a>
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
				<a n = "zimbraImapEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraImapEnabled Invalid values - True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraImapEnabled">True</a>
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
				<a n = "zimbraImapEnabled">{account.sometext}</a>
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
				<a n = "zimbraImapEnabled">{account.spchar}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraContactMaxNumEntries to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraContactMaxNumEntries">100</a>
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


	it('Regression | Modify an account and set zimbraContactMaxNumEntries to negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraContactMaxNumEntries">-1</a>
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
				<a n = "zimbraContactMaxNumEntries">:''&lt;//\\\\</a>
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
				<a n = "zimbraContactMaxNumEntries">1a2b</a>
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
				<a n = "zimbraContactMaxNumEntries">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraFeatureGalEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureGalEnabled">TRUE</a>
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
				<a n = "zimbraFeatureGalEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraFeatureCalendarEnabled Invalid values - True, blank, sometext, special character 2', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureCalendarEnabled">True</a>
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
				<a n = "zimbraFeatureCalendarEnabled">     </a>
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
				<a n = "zimbraFeatureCalendarEnabled">some text</a>
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
				<a n = "zimbraFeatureCalendarEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPrefSentMailFolder to inbox, sent, trash', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSentMailFolder">inbox</a>
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
				<a n = "zimbraPrefSentMailFolder">sent</a>
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
				<a n = "zimbraPrefSentMailFolder">trash</a>
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


	it('Regression | Modify an account and set zimbraPrefSentMailFolder to contacts, spchar, sometext, negative', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPrefSentMailFolder">contacts</a>
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
				<a n = "zimbraPrefSentMailFolder">:''&lt;//\\\\</a>
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
				<a n = "zimbraPrefSentMailFolder">some text</a>
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
				<a n = "zimbraPrefSentMailFolder">-1</a>
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


	it('Sanity | Modify an account and set zimbraPasswordMaxAge to valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxAge">100</a>
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


	it('Regression | Modify an account and set zimbraPasswordMaxAge Invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMaxAge">-1</a>
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
				<a n = "zimbraPasswordMaxAge">:''&lt;//\\\\</a>
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
				<a n = "zimbraPasswordMaxAge">1a2b</a>
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
				<a n = "zimbraPasswordMaxAge">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordEnforceHistory to some valid value', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordEnforceHistory">100</a>
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


	it('Regression | Modify an account and set zimbraPasswordMaxAge Invalid values negative, spchar, invalid number, starting-with-zero 1', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordEnforceHistory">-1</a>
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
				<a n = "zimbraPasswordEnforceHistory">:''&lt;//\\\\</a>
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
				<a n = "zimbraPasswordEnforceHistory">1a2b</a>
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
				<a n = "zimbraPasswordEnforceHistory">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraMailStatus enabled, disabled', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailStatus">enabled</a>
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
				<a n = "zimbraMailStatus">disabled</a>
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


	it('Regression | Modify an account and set zimbraMailStatus Invalid values - ENABLED, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailStatus">ENABLED</a>
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
				<a n = "zimbraMailStatus">     </a>
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
				<a n = "zimbraMailStatus">some text</a>
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
				<a n = "zimbraMailStatus">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraPasswordMinLength to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinLength">100</a>
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


	it('Regression | Modify an account and set zimbraPasswordMinLength Invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraPasswordMinLength">-1</a>
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
				<a n = "zimbraPasswordMinLength">:''&lt;//\\\\</a>
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
				<a n = "zimbraPasswordMinLength">1a2b</a>
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
				<a n = "zimbraPasswordMinLength">0123</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraMailTrashLifetime to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailTrashLifetime">40</a>
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
				<a n = "zimbraMailTrashLifetime">-1</a>
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
				<a n = "zimbraMailTrashLifetime">:''&lt;//\\\\</a>
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
				<a n = "zimbraMailTrashLifetime">1a2b</a>
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
				<a n = "zimbraMailTrashLifetime">0123</a>
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


	it('Sanity | Modify an account and set zimbraMailIdleSessionTimeout to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailIdleSessionTimeout">100</a>
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


	it('Regression | Modify an account and set zimbraMailIdleSessionTimeout to some invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailIdleSessionTimeout">-1</a>
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
				<a n = "zimbraMailIdleSessionTimeout">:''&lt;//\\\\</a>
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
				<a n = "zimbraMailIdleSessionTimeout">1a2b</a>
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
				<a n = "zimbraMailIdleSessionTimeout">0123</a>
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


	it('Sanity | Modify an account and set zimbraFeatureTaggingEnabled to TRUE, FALSE', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureTaggingEnabled">TRUE</a>
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
				<a n = "zimbraFeatureTaggingEnabled">FALSE</a>
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


	it('Regression | Modify an account and set zimbraFeatureTaggingEnabled to invalid values like True, blank, sometext, special character', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraFeatureTaggingEnabled">True</a>
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
				<a n = "zimbraFeatureTaggingEnabled">     </a>
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
				<a n = "zimbraFeatureTaggingEnabled">some text</a>
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
				<a n = "zimbraFeatureTaggingEnabled">:''&lt;//\\\\</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.isTrue((res.Fault && res.Fault.Detail && res.Fault.Detail.Error &&
			(res.Fault.Detail.Error.Code.includes('account.INVALID_ATTR_VALUE') ||
				res.Fault.Detail.Error.Code.includes('ldap.INVALID_ATTR_VALUE'))) ||
			!!res.ModifyAccountResponse || (res.Body && res.Body.ModifyAccountResponse),
			`Expected INVALID_ATTR_VALUE or success, got: ${res.Fault
				? JSON.stringify(res.Fault) : 'no fault'}`);
	});


	it('Sanity | Modify an account and set zimbraMailQuota to some valid values', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailQuota">100</a>
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


	it('Regression | Modify an account and set zimbraMailQuota to some Invalid values negative, spchar, invalid number, starting-with-zero', async () => {
		// ModifyAccountRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns = "urn:zimbraAdmin">
				<id>${test_accountid.id}</id>
				<a n = "zimbraMailQuota">-1</a>
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
				<a n = "zimbraMailQuota">:''&lt;//\\\\</a>
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
