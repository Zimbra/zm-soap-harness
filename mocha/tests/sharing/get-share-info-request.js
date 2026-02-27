import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sharing > Get Share Info Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Id, account1AuthToken;
	let account2Email, account2Id, account2AuthToken;
	let account3Email, account3Id, account3AuthToken;
	let dlName, dlId;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const res1 = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account1Email, account1Email
		);
		account1Id = res1.accountId;
		account1AuthToken = await soap.getAccountAuthToken(account1Email, config.accountPassword);

		// Create account2
		account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const res2 = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account2Email, account2Email
		);
		account2Id = res2.accountId;
		account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);

		// Create account3
		account3Email = `acct3.${common.getUniqueString()}@${testDomain}`;
		const res3 = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account3Email, account3Email
		);
		account3Id = res3.accountId;
		account3AuthToken = await soap.getAccountAuthToken(account3Email, config.accountPassword);

		// Create distribution list and add members
		dlName = `distlist.${common.getUniqueString()}@${testDomain}`;
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A Distribution List containing 3 users</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateDistributionListRequest should not fault');
		dlId = res.CreateDistributionListResponse.dl[0].id;

		// Add all members to DL
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account3Email}</dlm>
				<dlm>${account2Email}</dlm>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'AddDistributionListMemberRequest should not fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify GetShareInfoRequest receives appropriate responses', async () => {
		// As account2: share Inbox, Calendar, Briefcase with account1
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const acct2Folders = res.GetFolderResponse.folder[0].folder;
		const acct2Inbox = acct2Folders.find(f => f.name === 'Inbox');
		const acct2Calendar = acct2Folders.find(f => f.name === 'Calendar');
		const acct2Briefcase = acct2Folders.find(f => f.name === 'Briefcase');
		assert.exists(acct2Inbox, 'Account2 Inbox should exist');
		assert.exists(acct2Calendar, 'Account2 Calendar should exist');
		assert.exists(acct2Briefcase, 'Account2 Briefcase should exist');

		// Share Inbox with account1
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Inbox.id}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'Grant Inbox should not fault');

		// Share Calendar with account1
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Calendar.id}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'Grant Calendar should not fault');

		// Share Briefcase with account1
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Briefcase.id}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'Grant Briefcase should not fault');

		// As account1: accept Inbox and Briefcase (mount them)
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const acct1Root = res.GetFolderResponse.folder[0];
		const acct1RootId = acct1Root.id;

		const inboxMountName = `inboxshare.${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${inboxMountName}"
					zid="${account2Id}" rid="${acct2Inbox.id}" view="message"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'Mount Inbox should not fault');
		const inboxMountId = res.CreateMountpointResponse.link[0].id;

		const briefcaseMountName = `briefcaseshare.${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${briefcaseMountName}"
					zid="${account2Id}" rid="${acct2Briefcase.id}" view="document"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'Mount Briefcase should not fault');
		const briefcaseMountId = res.CreateMountpointResponse.link[0].id;

		// GetShareInfoRequest - check shares from account2
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareInfoRequest xmlns="urn:zimbraAccount">
				<grantee type="usr"/>
				<owner by="name">${account2Email}</owner>
			</GetShareInfoRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
		assert.exists(res.GetShareInfoResponse,
			'GetShareInfoResponse should exist');

		// As account3: share Tasks folder via DL
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const acct3Folders = res.GetFolderResponse.folder[0].folder;
		const acct3Tasks = acct3Folders.find(f => f.name === 'Tasks');
		assert.exists(acct3Tasks, 'Account3 Tasks should exist');

		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Tasks.id}">
					<grant gt="grp" d="${dlName}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);
		assert.notExists(res.Fault, 'Grant Tasks to DL should not fault');

		// Admin: GetShareInfoRequest for DL
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetShareInfoRequest xmlns="urn:zimbraAdmin">
				<grantee id="${dlId}"/>
				<owner by="name">${account3Email}</owner>
			</GetShareInfoRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'Admin GetShareInfoRequest should not fault');
		assert.exists(res.GetShareInfoResponse,
			'Admin GetShareInfoResponse should exist');

		// As account2: mount the Tasks folder shared by account3 via DL
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);
		const acct2Root = res.GetFolderResponse.folder[0];
		const acct2RootId = acct2Root.id;

		const taskMountName = `task.${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct2RootId}" name="${taskMountName}"
					zid="${account3Id}" rid="${acct3Tasks.id}" view="task"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'Mount Tasks should not fault');

		// Account2: GetShareInfoRequest for account3 shares
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareInfoRequest xmlns="urn:zimbraAccount">
				<owner by="name">${account3Email}</owner>
			</GetShareInfoRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'GetShareInfoRequest for account3 should not fault');
		assert.exists(res.GetShareInfoResponse,
			'GetShareInfoResponse for account3 should exist');
		const shares = res.GetShareInfoResponse.share;
		assert.exists(shares, 'Should contain share info');
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const taskShare = shareArr.find(s => s.folderPath === '/Tasks');
		assert.exists(taskShare, 'Tasks share should be visible');
		assert.equal(taskShare.ownerEmail, account3Email,
			'Owner email should match');
		assert.equal(taskShare.granteeType, 'grp',
			'Grantee type should be grp');

		// Revoke Inbox permission from account2 to account1
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${acct2Inbox.id}" zid="${account1Id}"/>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(res.Fault, 'Revoke Inbox should not fault');

		// Account1: mount Calendar and verify shares
		const calMountName = `calshare.${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${calMountName}"
					zid="${account2Id}" rid="${acct2Calendar.id}" view="appointment"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'Mount Calendar should not fault');
		const calMountId = res.CreateMountpointResponse.link[0].id;

		// Final GetShareInfoRequest - should see Calendar and Briefcase but not Inbox
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareInfoRequest xmlns="urn:zimbraAccount">
				<grantee type="usr"/>
				<owner by="name">${account2Email}</owner>
			</GetShareInfoRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'Final GetShareInfoRequest should not fault');
		assert.exists(res.GetShareInfoResponse,
			'Final GetShareInfoResponse should exist');
	});
});
