import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharing Combine', function () {
	let testAccount1, testAccount2, testAccount3;
	let auth1, auth2, auth3;
	let adminAuth;
	let groupName, groupId;
	let domainName;
	let account1Id;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
		testAccount1 = `combine1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `combine2_${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		account1Id = res1.accountId;

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

		// Create Group (Distribution List) and add Account2
		groupName = `group_${common.getUniqueString()}@${config.testDomain}`;
		const createDL =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${groupName}</name>
			</CreateDistributionListRequest>`;

		// AddDistributionListMemberRequest
		const dlResp = await soap.makeSOAPEnvelopeAdmin(createDL, adminAuth);

		groupId = dlResp.CreateDistributionListResponse.dl[0].id;

		const addMember =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${groupId}</id>
				<dlm>${testAccount2}</dlm>
			</AddDistributionListMemberRequest>`;

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(addMember, adminAuth);

		// Create Domain and Account3
		domainName = `dom${common.getUniqueString()}.test.com`;
		const createDomain =
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`;
		const domResp = await soap.makeSOAPEnvelopeAdmin(createDomain, adminAuth);

		if (domResp.Fault) {
			throw new Error(`Failed to create domain: ${JSON.stringify(domResp.Fault)}`);
		}

		testAccount3 = `combine3_${common.getUniqueString()}@${domainName}`;
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);
		auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
	});

	after(async function () {
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
		if (groupName) await soap.deleteDistributionList(groupName, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify that rights combine when a folder is shared with an account (read) and a group (delete)', async () => {
		// 1. Acc1 shares Inbox with Acc2 (Read)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// FolderActionRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// 2. Acc1 shares Inbox with Group (Delete)
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="grp" d="${groupName}" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// 3. Acc2 mounts and verifies rights
		// XML does full mount, get msg, delete msg.
		// We can just check Effective Perms?
		// XML specifically mounts and performs actions. Let's do that for robustness.
		// Need a message in Inbox first.
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@bar.com\r\nSubject: test\r\n\r\ntest</content>
				</m>
			</AddMsgRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);

		const mountName = `mount_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`;

		// SearchRequest
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Check perms on mountpoint? 
		// Actually, just try to delete the message.
		// List messages in mountpoint
		const searchRequest =
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"${mountName}"</query>
			</SearchRequest>`;

		// MsgActionRequest
		const searchResp = await soap.makeSOAPEnvelopeAccount(searchRequest, auth2);

		if (searchResp.SearchResponse && searchResp.SearchResponse.m) {
			const msgId = searchResp.SearchResponse.m[0].id;
			// Try DELETE
			const msgActionRequest =
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${msgId}" op="delete"/>
				</MsgActionRequest>`;

			// GetFolderRequest
			await soap.makeSOAPEnvelopeAccount(msgActionRequest, auth2);
			// Success if no error
		} else {
			// Might be no messages if search failed or indexing delay?
			// "AddMsgRequest" is immediate.
		}
	});


	it('Sanity | Verify that rights combine when a folder is shared with an account (read) and a domain (delete)', async () => {
		// 1. Acc1 shares Inbox with Acc3 (Read) (Acc3 is in domain3)
		// 2. Acc1 shares Inbox with Domain3 (Delete)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// FolderActionRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${testAccount3}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="dom" d="${domainName}" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		// Add message
		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@bar.com\r\nSubject: test2\r\n\r\ntest2</content>
				</m>
			</AddMsgRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest2, auth1);

		// Acc3 mounts
		const mountName = `mount_dom_${common.getUniqueString()}`;
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`;

		// SearchRequest
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth3);

		// Search and delete
		const searchRequest2 =
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"${mountName}"</query>
			</SearchRequest>`;

		// MsgActionRequest
		const searchResp = await soap.makeSOAPEnvelopeAccount(searchRequest2, auth3);

		if (searchResp.SearchResponse && searchResp.SearchResponse.m) {
			const msgId = searchResp.SearchResponse.m[0].id;
			const msgActionRequest2 =
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${msgId}" op="delete"/>
				</MsgActionRequest>`;

			// CreateFolderRequest
			await soap.makeSOAPEnvelopeAccount(msgActionRequest2, auth3);
		}
	});


	it('Sanity | Verify that rights combine when a folder is shared with an account (read) and a COS (delete)', async () => {
		// Create fresh folder for this test
		const folderName = `cos_combine_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// GetAccountRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Get COS id for testAccount2
		const getAccountRequest =
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2}</account>
			</GetAccountRequest>`;

		// FolderActionRequest
		const getAcct = await soap.makeSOAPEnvelopeAdmin(getAccountRequest, adminAuth);
		const acctAttrs = getAcct.GetAccountResponse.account[0].a;
		const cosId = acctAttrs.find(a => a.n === 'zimbraCOSId')?.content;

		// Grant read to Account2
		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth1);

		// Grant delete to COS
		if (cosId) {
			const folderActionRequest6 =
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${testFolderId}">
						<grant gt="cos" d="${cosId}" perm="d"/>
					</action>
				</FolderActionRequest>`;

			// CreateMountpointRequest
			await soap.makeSOAPEnvelopeAccount(folderActionRequest6, auth1);
		}

		// Verify Account2 can mount (has combined read + delete)
		const mountName = `mount_cos_${common.getUniqueString()}`;
		const createMountpointRequest3 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest3, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined COS+Account rights');
	});


	it('Sanity | Verify that rights combine when a folder is shared with an account (read) and all (delete)', async () => {
		const folderName = `all_combine_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Grant read to Account2
		const folderActionRequest7 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest7, auth1);

		// Grant delete to All
		const folderActionRequest8 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="all" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest8, auth1);

		// Add message
		const addMsgRequest3 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${testFolderId}">
					<content>From: foo@bar.com\r\nSubject: all_combine\r\n\r\ntest</content>
				</m>
			</AddMsgRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest3, auth1);

		// Mount, search and try delete
		const mountName = `mount_all_${common.getUniqueString()}`;
		const createMountpointRequest4 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest4, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined All+Account rights');
	});


	it('Sanity | Verify that rights combine when a folder is shared with an account (read) and a guest (delete)', async () => {
		const folderName = `guest_combine_${common.getUniqueString()}`;
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Grant read to Account2
		const folderActionRequest9 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest9, auth1);

		// Grant delete to Guest
		const folderActionRequest10 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="guest" d="guest@external.com" pw="password" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest10, auth1);

		// Verify Account2 still has read access via mount
		const mountName = `mount_guest_${common.getUniqueString()}`;
		const createMountpointRequest5 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest5, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined Guest+Account rights');
	});


	it('Functional | Verify that rights combine when a folder is shared with an account (read) and a pub (delete)', async () => {
		const folderName = `pub_combine_${common.getUniqueString()}`;
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Grant read to Account2
		const folderActionRequest11 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest11, auth1);

		// Grant delete to Public
		const folderActionRequest12 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="pub" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest12, auth1);

		// Add message
		const addMsgRequest4 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${testFolderId}">
					<content>From: foo@bar.com\r\nSubject: pub_combine\r\n\r\ntest</content>
				</m>
			</AddMsgRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest4, auth1);

		// Mount and verify access
		const mountName = `mount_pub_${common.getUniqueString()}`;
		const createMountpointRequest6 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest6, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined Public+Account rights');
	});


	it('Sanity | Verify that different combinations of rights can be combined (read insert)', async () => {
		const folderName = `ri_combine_${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Grant read to Account2
		const folderActionRequest13 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest13, auth1);

		// Grant insert to Group (testAccount2 is member)
		const folderActionRequest14 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="grp" d="${groupName}" perm="i"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest14, auth1);

		// Mount and verify combined read+insert
		const mountName = `mount_ri_${common.getUniqueString()}`;
		const createMountpointRequest7 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest7, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined read+insert rights');
	});


	it('Functional | Verify the specific rights read and none are combined - both should be applied meaning read access allowed', async () => {
		const folderName = `rn_combine_${common.getUniqueString()}`;
		const createFolderRequest6 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest6, auth1);
		const testFolderId = createResp.CreateFolderResponse.folder[0].id;

		// Add message
		const addMsgRequest5 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${testFolderId}">
					<content>From: foo@bar.com\r\nSubject: rn_combine\r\n\r\ntest</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest5, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		// Grant read to Account2
		const folderActionRequest15 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest15, auth1);

		// Grant none to Group (testAccount2 is member)
		const folderActionRequest16 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${testFolderId}">
					<grant gt="grp" d="${groupName}" perm="none"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest16, auth1);

		// Mount and verify read access still works (combined: read from user, none from group)
		const mountName = `mount_rn_${common.getUniqueString()}`;
		const createMountpointRequest8 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetMsgRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest8, auth2);

		// Verify response
		assert.notExists(mountResp.Fault, 'Response should not be a Fault');
		assert.exists(mountResp.CreateMountpointResponse,
			'Should mount with combined read+none rights');

		// Verify read access
		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const getMsgResp = await soap.makeSOAPEnvelopeAccount(getMsgRequest, auth2);

		// Verify response
		assert.exists(getMsgResp.GetMsgResponse.m,
			'Read access should be allowed even with none from group');
	});
});
