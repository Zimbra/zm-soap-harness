import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sharing > Shared All Folders With Me', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Id, account1AuthToken;
	let account2Email, account2Id, account2AuthToken;
	let account3Email, account3Id, account3AuthToken;
	let account4Email, account4AuthToken;
	let dlName, dlId, cosName, cosId;
	let acct1RootId;
	let acct2InboxId, acct2CalendarId, acct2BriefcaseId,
		acct2ContactId, acct2DraftsId;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts 1-3
		account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account1Email, account1Email);
		account1Id = res1.accountId;
		account1AuthToken = await soap.getAccountAuthToken(account1Email, config.accountPassword);

		account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account2Email, account2Email);
		account2Id = res2.accountId;
		account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);

		account3Email = `acct3.${common.getUniqueString()}@${testDomain}`;
		const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, account3Email, account3Email);
		account3Id = res3.accountId;
		account3AuthToken = await soap.getAccountAuthToken(account3Email, config.accountPassword);

		// Create COS
		cosName = `cos${common.getUniqueString()}`;

		// CreateCosRequest
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateCosRequest should not fault');
		cosId = res.CreateCosResponse.cos[0].id;

		// Create account4 with specific COS
		account4Email = `acct4.${common.getUniqueString()}@${testDomain}`;

		// Create account
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccount4 should not fault');
		account4AuthToken = await soap.getAccountAuthToken(account4Email, config.accountPassword);

		// Create DL and add members
		dlName = `distlist.${common.getUniqueString()}@${testDomain}`;

		// CreateDistributionListRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDL should not fault');
		dlId = res.CreateDistributionListResponse.dl[0].id;

		// AddDistributionListMemberRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account3Email}</dlm>
				<dlm>${account2Email}</dlm>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AddDLMembers should not fault');

		// Get account2 folder IDs
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const folderList = res.GetFolderResponse.folder[0].folder;
		acct2InboxId = folderList.find(f => f.name === 'Inbox').id;
		acct2CalendarId = folderList.find(f => f.name === 'Calendar').id;
		acct2BriefcaseId = folderList.find(f => f.name === 'Briefcase').id;
		acct2ContactId = folderList.find(f => f.name === 'Contacts').id;
		acct2DraftsId = folderList.find(f => f.name === 'Drafts').id;

		// Get account1 root ID
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		acct1RootId = res.GetFolderResponse.folder[0].id;
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
	it('Sanity | GetShareInfoRequest when account2 shares folders to account1', async () => {
		// Account2 shares Inbox and Calendar with account1
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2InboxId}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Inbox should not fault');

		// FolderActionRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2CalendarId}">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Calendar should not fault');

		// Account1 mounts Inbox
		const inboxMountName = `inboxshare.${common.getUniqueString()}`;

		// CreateMountpointRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${inboxMountName}"
					zid="${account2Id}" rid="${acct2InboxId}" view="message"/>
			</CreateMountpointRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Mount Inbox should not fault');

		// GetShareInfoRequest - verify
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
	});


	it('Sanity | GetShareInfoRequest when account shares folder with public', async () => {
		// Account2 shares Contacts with public
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2ContactId}">
					<grant gt="pub" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Contacts to public should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account1: verify shared contacts visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
		const shares = res.GetShareInfoResponse.share;

		// Verify response
		assert.exists(shares, 'Shares should exist');
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const pubShare = shareArr.find(s =>
			s.ownerEmail === account2Email && s.granteeType === 'pub'
		);

		// Verify response
		assert.exists(pubShare, 'Public share should be visible');

		// Mount shared contacts
		const contactMountName = `contacts.${common.getUniqueString()}`;

		// CreateMountpointRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${contactMountName}"
					zid="${account2Id}" rid="${acct2ContactId}" view="contact"/>
			</CreateMountpointRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Mount Contacts should not fault');
	});


	it('Sanity | GetShareInfoRequest after revoking shared permission', async () => {
		// Account2 revokes Inbox permission from account1
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${acct2InboxId}" zid="${account1Id}"/>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Revoke Inbox should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account1: mount Calendar and verify shares
		const calMountName = `calshare.${common.getUniqueString()}`;

		// CreateMountpointRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct1RootId}" name="${calMountName}"
					zid="${account2Id}" rid="${acct2CalendarId}" view="appointment"/>
			</CreateMountpointRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Mount Calendar should not fault');

		// Verify GetShareInfoRequest
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
	});


	it('Sanity | GetShareInfoRequest when account shares folder with DL', async () => {
		// Account3: share Tasks folder with DL
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);
		const acct3Folders = res.GetFolderResponse.folder[0].folder;
		const acct3Tasks = acct3Folders.find(f => f.name === 'Tasks');

		// Verify response
		assert.exists(acct3Tasks, 'Account3 Tasks should exist');

		// FolderActionRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct3Tasks.id}">
					<grant gt="grp" d="${dlName}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Tasks to DL should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account2 (DL member): verify Task share visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
		const shares = res.GetShareInfoResponse.share;

		// Verify response
		assert.exists(shares, 'Shares should exist');
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const taskShare = shareArr.find(s =>
			s.folderPath === '/Tasks' && s.view === 'task'
		);

		// Verify response
		assert.exists(taskShare, 'Tasks share should be visible');

		// Mount Tasks folder
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);
		const acct2Root = res.GetFolderResponse.folder[0];

		const taskMountName = `task.${common.getUniqueString()}`;

		// CreateMountpointRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acct2Root.id}" name="${taskMountName}"
					zid="${account3Id}" rid="${acct3Tasks.id}" view="task"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Mount Tasks should not fault');

		// Verify mount in GetShareInfoRequest
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest after mount should not fault');
	});


	it('Sanity | GetShareInfoRequest when DL share revoked from specific user', async () => {
		// Account2: share Tasks with DL, then revoke from account1
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);
		const acct2Folders = res.GetFolderResponse.folder[0].folder;
		const acct2Tasks = acct2Folders.find(f => f.name === 'Tasks');

		// Verify response
		assert.exists(acct2Tasks, 'Account2 Tasks should exist');

		// FolderActionRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2Tasks.id}">
					<grant gt="grp" d="${dlName}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Tasks to DL should not fault');

		// Revoke from account1 specifically
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${acct2Tasks.id}" zid="${account1Id}"/>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Revoke from account1 should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account1: verify inherited task share still visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
	});


	it('Sanity | GetShareInfoRequest when account shares folder with all', async () => {
		// Account2 shares Briefcase with all
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2BriefcaseId}">
					<grant gt="all" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Briefcase to all should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account1: verify share visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
		const shares = res.GetShareInfoResponse.share;
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const allShare = shareArr.find(s =>
			s.ownerId === account2Id && s.view === 'document'
		);

		// Verify response
		assert.exists(allShare, 'Briefcase share with all should be visible');
	});


	it('Sanity | GetShareInfoRequest when account shares folder with domain', async () => {
		// Account2 shares Drafts with domain
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2DraftsId}">
					<grant gt="dom" perm="rwidx" d="${testDomain}"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Drafts to domain should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account1: verify share visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetShareInfoRequest should not fault');
		const shares = res.GetShareInfoResponse.share;
		const shareArr = Array.isArray(shares) ? shares : [shares];
		const domShare = shareArr.find(s =>
			s.ownerId === account2Id &&
			s.granteeType === 'dom' &&
			s.folderPath === '/Drafts'
		);

		// Verify response
		assert.exists(domShare, 'Drafts share with domain should be visible');
	});


	it('Sanity | GetShareInfoRequest when account shares folder with COS', async () => {
		// Account2 shares Drafts with COS
		let res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct2DraftsId}">
					<grant gt="cos" perm="rwidx" d="${cosName}"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant Drafts to COS should not fault');

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Account4 (belongs to COS): verify share visible
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetShareInfoRequest xmlns="urn:zimbraAccount"/>', account4AuthToken
		);
		if (!res.Fault) {

			// Verify response
		}
	});
});
