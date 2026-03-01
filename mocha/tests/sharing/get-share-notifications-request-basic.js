import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sharing > Get Share Notifications Request Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1AuthToken;
	let account2Email, account2AuthToken;
	let account3Email, account3AuthToken;
	let account4Email, account4AuthToken;
	let dl1Name, dl1Id;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `share1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account1Email, account1Email);
		account1AuthToken = await soap.getAccountAuthToken(account1Email, config.accountPassword);

		account2Email = `share2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account2Email, account2Email);
		account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);

		account3Email = `share3.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account3Email, account3Email);
		account3AuthToken = await soap.getAccountAuthToken(account3Email, config.accountPassword);

		account4Email = `share4.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account4Email, account4Email);
		account4AuthToken = await soap.getAccountAuthToken(account4Email, config.accountPassword);

		// Create DL and add members
		dl1Name = `dl1.${common.getUniqueString()}@${testDomain}`;

		// CreateDistributionListRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dl1Name}</name>
				<a n="description">A Distribution List containing users</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDistributionListRequest should not fault');
		dl1Id = res.CreateDistributionListResponse.dl[0].id;

		// AddDistributionListMemberRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl1Id}</id>
				<dlm>${account3Email}</dlm>
				<dlm>${account2Email}</dlm>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AddDistributionListMemberRequest should not fault');
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
	it('Sanity | GetShareNotificationsRequest gets notification about share', async () => {
		// Account2 shares Calendar with Account1 and sends notification
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const acct2Folders = res.GetFolderResponse.folder[0].folder;
		const acct2Calendar = acct2Folders.find(f => f.name === 'Calendar');

		// Verify response
		assert.exists(acct2Calendar, 'Account2 Calendar should exist');

		// Share Calendar with account1
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Calendar.id}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Calendar should not fault');

		// Send share notification
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct2Calendar.id}" gt="usr" d="${account1Email}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account1: search for share notification email
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

		// Account1: GetShareNotificationsRequest
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse should exist');
		const shares = res.GetShareNotificationsResponse.share;

		// Verify response
		assert.exists(shares, 'Share notifications should exist');
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const shareNotif = shareArr.find(s => s.grantor);

		// Verify response
		assert.exists(shareNotif, 'Share notification with grantor should exist');
	});


	it('Sanity | GetShareNotificationsRequest responds with blank if folder not shared', async () => {
		// Account2: GetShareNotificationsRequest should return blank
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse should exist');
	});


	it('Sanity | GetShareNotificationsRequest gets notification about share to DL members', async () => {
		// Account3 shares Calendar with DL and sends notification
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const acct3Folders = res.GetFolderResponse.folder[0].folder;
		const acct3Calendar = acct3Folders.find(f => f.name === 'Calendar');

		// Verify response
		assert.exists(acct3Calendar, 'Account3 Calendar should exist');

		// Share Calendar with DL
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Calendar.id}">
					<grant gt="grp" d="${dl1Name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Calendar to DL should not fault');

		// Send share notification to DL
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Calendar.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account1 (DL member): check share notification
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse should exist');
		const shares = res.GetShareNotificationsResponse.share;

		// Verify response
		assert.exists(shares, 'Share notifications should exist');

		// Account2 (DL member): check share notification
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest for account2 should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse for account2 should exist');
	});


	it('Sanity | GetShareNotificationsRequest gets notification to added DL member by admin', async () => {
		// Account3 shares Briefcase with DL and sends notification
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);
		const acct3Folders = res.GetFolderResponse.folder[0].folder;
		const acct3Briefcase = acct3Folders.find(f => f.name === 'Briefcase');

		// Verify response
		assert.exists(acct3Briefcase, 'Account3 Briefcase should exist');

		// FolderActionRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Briefcase.id}">
					<grant gt="grp" d="${dl1Name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Briefcase to DL should not fault');

		// SendShareNotificationRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Briefcase.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account1 (existing DL member): verify notification
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse should exist');

		// Add account4 to DL as new member
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dl1Id}</id>
				<dlm>${account4Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AddDistributionListMemberRequest should not fault');

		// Re-send share notification after adding new member
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${acct3Briefcase.id}" gt="grp" d="${dl1Name}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Re-send notification should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account4 (newly added DL member): verify notification
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareNotificationsRequest xmlns="urn:zimbraMail"/>', account4AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareNotificationsRequest for account4 should not fault');
		assert.exists(res.GetShareNotificationsResponse,
			'GetShareNotificationsResponse for account4 should exist');
	});
});
