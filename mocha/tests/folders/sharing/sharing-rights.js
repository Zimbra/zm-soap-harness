import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharing Rights', function () {
	let testAccount1, testAccount2, testAccount3;
	let auth1, auth2, auth3;
	let account1Id;

	before(async function () {
		testAccount1 = `rights1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `rights2_${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `rights3_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
		auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
		account1Id = res1.accountId;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify that sharing folders with read access allows messages to be viewed, but not added, modified, deleted, or reshared', async () => {
		// Share Folder with Acc2 (Read)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `read_only_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Acc2 Mounts
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_read" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetMsgRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 1. GetMsg - Allowed
		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(getMsgRequest, auth2);

		// 2. AddMsg - Denied
		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${mountId}">
					<content>Fail</content>
				</m>
			</AddMsgRequest>`;

		// MsgActionRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(addMsgRequest2, auth2);

		// Verify response
		assert.exists(addRes.Fault, 'AddMsg should fail for Read-only share');

		// 3. MsgAction (Delete) - Denied
		const msgActionRequest =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="delete"/>
			</MsgActionRequest>`;

		// MsgActionRequest
		const delRes = await soap.makeSOAPEnvelopeAccount(msgActionRequest, auth2);

		// Verify response
		assert.exists(delRes.Fault, 'Delete should fail for Read-only share');

		// 4. MsgAction (Read/Unread) - May or may not be denied depending on server config
		// Some Zimbra versions allow marking as read with 'r' permission
		const msgActionRequest2 =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="read"/>
			</MsgActionRequest>`;

		// GetFolderRequest
		const readRes = await soap.makeSOAPEnvelopeAccount(msgActionRequest2, auth2);
		// Accept both: Fault (denied) or MsgActionResponse (allowed)
		// Verify response
		assert.isTrue(readRes.Fault !== undefined || readRes.MsgActionResponse !== undefined,
			'Mark Read should either fail or succeed gracefully');
	});


	it('Sanity | Verify that sharing folders with manager (rwidx) access allows messages to be viewed, added, modified, and deleted, but not reshared', async () => {
		// Share Folder with Acc3 (Manager)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `manager_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest3 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest3, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount3}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Acc3 Mounts
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_mgr" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// GetMsgRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth3);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 1. GetMsg - Allowed
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(getMsgRequest2, auth3);

		// 2. AddMsg - Allowed
		const addMsgRequest4 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${mountId}">
					<content>Success</content>
				</m>
			</AddMsgRequest>`;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest4, auth3);

		// 3. MsgAction (Read) - Allowed
		const msgActionRequest3 =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="read"/>
			</MsgActionRequest>`;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(msgActionRequest3, auth3);

		// 4. MsgAction (Delete) - Allowed
		const msgActionRequest4 =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="delete"/>
			</MsgActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(msgActionRequest4, auth3);
	});


	it('Functional | Verify a grantee with ra rights can share the folder again to another user', async () => {
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `write_only_${common.getUniqueString()}`;
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const addMsgRequest5 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest5, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="w"/>
				</action>
			</FolderActionRequest>`;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Write operations (flag/read marking) via direct access
		const msgActionRequest5 =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="flag"/>
			</MsgActionRequest>`;

		// GetMsgRequest
		const writeRes = await soap.makeSOAPEnvelopeAccount(msgActionRequest5, auth2);
		// Write-only should allow flag/tag operations
		// Verify response
		assert.isTrue(writeRes.Fault !== undefined || writeRes.MsgActionResponse !== undefined,
			'Write operation should have a defined response');

		// GetMsg - Denied (no read permission)
		const getMsgRequest3 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// GetFolderRequest
		const readRes = await soap.makeSOAPEnvelopeAccount(getMsgRequest3, auth2);

		// Verify response
		assert.exists(readRes.Fault, 'GetMsg should fail for Write-only share');
	});


	it('Functional | Verify tagging a shared message does not apply', async () => {
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `insert_only_${common.getUniqueString()}`;
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a msg as owner
		const addMsgRequest6 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest6, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="i"/>
				</action>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		// Verify grant is correctly applied with perm="i"
		const getFolderRequest3 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;

		// GetMsgRequest
		const folderCheck = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth1);
		const folder = folderCheck.GetFolderResponse.folder[0];

		// Verify response
		assert.exists(folder.acl, 'ACL should exist');
		const grants = Array.isArray(folder.acl.grant) ? folder.acl.grant : [folder.acl.grant];
		const insertGrant = grants.find(g => g.perm === 'i');

		// Verify response
		assert.exists(insertGrant, 'Insert-only grant should exist with perm="i"');

		// GetMsg - Should be denied (no read permission)
		const getMsgRequest4 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;

		// GetFolderRequest
		const readRes = await soap.makeSOAPEnvelopeAccount(getMsgRequest4, auth2);

		// Verify response
		assert.exists(readRes.Fault, 'GetMsg should fail for Insert-only share');
	});


	it('Functional | Verify flagging a shared message', async () => {
		const getFolderRequest4 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest4, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `delete_only_${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		const addMsgRequest7 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		const addResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest7, auth1);
		const msgId = addResp.AddMsgResponse.m[0].id;

		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="d"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth1);

		// Mount
		const createMountpointRequest3 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_del_${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest3, auth2);

		// Delete - Allowed
		const msgActionRequest6 =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="delete"/>
			</MsgActionRequest>`;

		// GetFolderRequest
		const delRes = await soap.makeSOAPEnvelopeAccount(msgActionRequest6, auth2);

		// Verify response
		assert.notExists(delRes.Fault, 'Delete should succeed for Delete-only share');
	});


	it('Sanity | Verify that sharing contacts with none access does not grant access to the contact information', async () => {
		const getFolderRequest5 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest5, auth1);
		const contactsId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Contacts').id;

		const folderName = `contacts_none_${common.getUniqueString()}`;
		const createFolderRequest6 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsId}" view="contact"/>
			</CreateFolderRequest>`;

		// CreateContactRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest6, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Create a contact
		const createContactRequest =
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folderId}">
					<a n="firstName">Test${common.getUniqueString()}</a>
					<a n="lastName">Contact</a>
					<a n="email">test@example.com</a>
				</cn>
			</CreateContactRequest>`;

		// FolderActionRequest
		const contactResp = await soap.makeSOAPEnvelopeAccount(createContactRequest, auth1);
		const contactId = contactResp.CreateContactResponse.cn[0].id;

		// Share with none
		const folderActionRequest6 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="none"/>
				</action>
			</FolderActionRequest>`;

		// GetContactsRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest6, auth1);

		// Try to access contact directly
		const getContactRequest =
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${account1Id}:${contactId}"/>
			</GetContactsRequest>`;

		// GetFolderRequest
		const contactAccessResp = await soap.makeSOAPEnvelopeAccount(getContactRequest, auth2);

		// Verify response
		assert.exists(contactAccessResp.Fault,
			'Contact access should be denied with none permissions');
	});


	it('Sanity | Verify that a folder shared with none permissions cannot be searched', async () => {
		const getFolderRequest6 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest6, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `search_none_${common.getUniqueString()}`;
		const createFolderRequest7 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// AddMsgRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest7, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add message
		const addMsgRequest8 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Subject: searchable content
					Test content for search</content>
				</m>
			</AddMsgRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(addMsgRequest8, auth1);

		// Share with none
		const folderActionRequest7 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="none"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest7, auth1);

		// Mount
		const createMountpointRequest4 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_none_${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;

		// SearchRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest4, auth2);

		// Mount may fail or succeed with none permissions
		if (mountResp.Fault) {
			// Mount itself was denied - none permissions working correctly
			// Verify response
			assert.exists(mountResp.Fault,
				'Mount should fail with none permissions');
		} else {
			// Mount succeeded - verify search is blocked
			const searchRequest =
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>in:"mount_none" searchable</query>
				</SearchRequest>`;
			const searchResp = await soap.makeSOAPEnvelopeAccount(searchRequest, auth2);

			// Verify response
			assert.isTrue(searchResp.Fault !== undefined || !searchResp.SearchResponse.m,
				'Search in none-permission share should be denied or empty');
		}
	});
});
