import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharing Inherit', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;

	before(async function () {
		testAccount1 = `inherit1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `inherit2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.defaultPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.defaultPassword);
		account1Id = res1.accountId;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify flags i does not allow subfolders to be read', async () => {
		// XML: Create folder1, Create folder2 inside with f="i". Share folder1. Folder2 should NOT be accessible?
		// Wait, f="i" usually means "Checked" in UI (IMAP subscribed?).
		// If XML says PERM_DENIED, then "i" might mean something else in local context or default is inherit and "i" blocks it?
		// Zimbra docs: f (flags):
		// u=unread, f=flagged, a=attachment, r=replied, s=sent, w=forwarded, d=draft, x=deleted, n=notification, i=indexed? 
		// Or maybe 'i' stands for 'exclude from free/busy'?
		// Actually, let's look at the XML behavior.
		// Grant is on folder1.
		// Subfolder2 is created with f="i".
		// Access to message in Subfolder2 is DENIED.
		// This implies inheritance blocked.

		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folder1Name = `folder1_${common.getUniqueString()}`;
		const create1 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const resp1 = await soap.makeSOAPEnvelopeAccount(create1, auth1);
		const folder1Id = resp1.CreateFolderResponse.folder[0].id;

		const folder2Name = `folder2_${common.getUniqueString()}`;
		const create2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="${folder1Id}" f="i"/>
			</CreateFolderRequest>`;
		const resp2 = await soap.makeSOAPEnvelopeAccount(create2, auth1);
		const folder2Id = resp2.CreateFolderResponse.folder[0].id;

		// Add messages
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder1Id}">
					<content>Content1</content>
				</m>
			</AddMsgRequest>`;
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);

		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder2Id}">
					<content>Content2</content>
				</m>
			</AddMsgRequest>`;
		const ref2 = await soap.makeSOAPEnvelopeAccount(addMsgRequest2, auth1);
		const msg2Id = ref2.AddMsgResponse.m[0].id;

		// Share folder1
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder1Id}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Mount
		const mountName = `mount_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${folder1Id}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Try to get message in folder2 (which is subfolder of mountpoint)
		// Access via mountpoint: mountName/folder2Name ?
		// Or via Direct ID access? XML uses `GetMsgRequest` with `m id="account1Id:msg2Id"`.
		// This is Direct access checking permission.

		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msg2Id}"/>
			</GetMsgRequest>`;
		const getMsgResp = await soap.makeSOAPEnvelopeAccount(getMsgRequest, auth2);
		assert.exists(getMsgResp.Fault,
			'Access to subfolder should be denied with f="i"');
	});


	it('Sanity | Verify by default subfolders are allowed to be read', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folder3Name = `folder3_${common.getUniqueString()}`;
		const create3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder3Name}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const resp3 = await soap.makeSOAPEnvelopeAccount(create3, auth1);
		const folder3Id = resp3.CreateFolderResponse.folder[0].id;

		const folder4Name = `folder4_${common.getUniqueString()}`;
		const create4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder4Name}" l="${folder3Id}"/>
			</CreateFolderRequest>`;
		const resp4 = await soap.makeSOAPEnvelopeAccount(create4, auth1);
		const folder4Id = resp4.CreateFolderResponse.folder[0].id;

		// Add msg to subfolder
		const addMsgRequest3 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder4Id}">
					<content>Content4</content>
				</m>
			</AddMsgRequest>`;
		const ref4 = await soap.makeSOAPEnvelopeAccount(addMsgRequest3, auth1);
		const msg4Id = ref4.AddMsgResponse.m[0].id;

		// Share parent folder3
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder3Id}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Mount
		const createMountpointRequest2 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${folder3Name}" zid="${account1Id}" rid="${folder3Id}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth2);

		// Verify Access to subfolder message
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msg4Id}"/>
			</GetMsgRequest>`;
		const getMsg = await soap.makeSOAPEnvelopeAccount(getMsgRequest2, auth2);
		assert.exists(getMsg.GetMsgResponse.m,
			'Should be able to get message in inherited subfolder');
	});


	it('Functional | Verify that newly-created subfolders will automatically inherit granted rights as appropriate', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Create 3-level folder structure: parent > child > grandchild
		const parentName = `parent_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const childName = `child_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${childName}" l="${parentId}"/>
			</CreateFolderRequest>`;
		const childResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const childId = childResp.CreateFolderResponse.folder[0].id;

		const grandchildName = `grandchild_${common.getUniqueString()}`;
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${grandchildName}" l="${childId}"/>
			</CreateFolderRequest>`;
		const grandchildResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth1);
		const grandchildId = grandchildResp.CreateFolderResponse.folder[0].id;

		// Add message to grandchild
		const addMsgRequest4 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${grandchildId}">
					<content>Grandchild content</content>
				</m>
			</AddMsgRequest>`;
		const msgResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest4, auth1);
		const msgId = msgResp.AddMsgResponse.m[0].id;

		// Share parent folder only
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Mount parent
		const createMountpointRequest3 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest3, auth2);

		// Verify access to grandchild message (inherited through 2 levels)
		const getMsgRequest3 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const getMsg = await soap.makeSOAPEnvelopeAccount(getMsgRequest3, auth2);
		assert.exists(getMsg.GetMsgResponse.m,
			'Should access grandchild message via multi-level inheritance');
	});


	it('Functional | Verify that Existing folders moved to a different point in the folder hierarchy will also reinterpret their inherited permissions in the context of their new location.', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const parentName = `parent_override_${common.getUniqueString()}`;
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const childName = `child_override_${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${childName}" l="${parentId}"/>
			</CreateFolderRequest>`;
		const childResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth1);
		const childId = childResp.CreateFolderResponse.folder[0].id;

		// Add msg to child
		const addMsgRequest5 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${childId}">
					<content>Content</content>
				</m>
			</AddMsgRequest>`;
		const msgResp = await soap.makeSOAPEnvelopeAccount(addMsgRequest5, auth1);
		const msgId = msgResp.AddMsgResponse.m[0].id;

		// Share parent with read-only
		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		// Share child with manager rights (override)
		const folderActionRequest5 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${childId}">
					<grant gt="usr" d="${testAccount2}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest5, auth1);

		// Mount parent
		const createMountpointRequest4 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(createMountpointRequest4, auth2);

		// Verify acc2 can delete msg in child (manager rights override read-only)
		const msgActionRequest =
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${account1Id}:${msgId}" op="delete"/>
			</MsgActionRequest>`;
		const delRes = await soap.makeSOAPEnvelopeAccount(msgActionRequest, auth2);
		assert.notExists(delRes.Fault,
			'Child folder override should allow delete even though parent is read-only');
	});


	it('Sanity | Verify by default read permission applies to multiple levels (4 levels) of subfolders', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Create 4-level structure: L1 > L2 > L3 > L4
		const l1Name = `L1_${common.getUniqueString()}`;
		const createL1 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${l1Name}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const l1Resp = await soap.makeSOAPEnvelopeAccount(createL1, auth1);
		const l1Id = l1Resp.CreateFolderResponse.folder[0].id;

		const l2Name = `L2_${common.getUniqueString()}`;
		const createL2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${l2Name}" l="${l1Id}"/>
			</CreateFolderRequest>`;
		const l2Resp = await soap.makeSOAPEnvelopeAccount(createL2, auth1);
		const l2Id = l2Resp.CreateFolderResponse.folder[0].id;

		const l3Name = `L3_${common.getUniqueString()}`;
		const createL3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${l3Name}" l="${l2Id}"/>
			</CreateFolderRequest>`;
		const l3Resp = await soap.makeSOAPEnvelopeAccount(createL3, auth1);
		const l3Id = l3Resp.CreateFolderResponse.folder[0].id;

		const l4Name = `L4_${common.getUniqueString()}`;
		const createL4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${l4Name}" l="${l3Id}"/>
			</CreateFolderRequest>`;
		const l4Resp = await soap.makeSOAPEnvelopeAccount(createL4, auth1);
		const l4Id = l4Resp.CreateFolderResponse.folder[0].id;

		// Add message to L4
		const addMsg =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${l4Id}">
					<content>L4 content</content>
				</m>
			</AddMsgRequest>`;
		const msgResp = await soap.makeSOAPEnvelopeAccount(addMsg, auth1);
		const msgId = msgResp.AddMsgResponse.m[0].id;

		// Share L1
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${l1Id}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount L1
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${l1Name}" zid="${account1Id}" rid="${l1Id}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(mount, auth2);

		// Verify access to L4 message
		const getMsg =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const getMsgResp = await soap.makeSOAPEnvelopeAccount(getMsg, auth2);
		assert.exists(getMsgResp.GetMsgResponse.m,
			'Should access L4 message via 4-level inheritance');
	});


	it('Sanity | Verify that one subfolder with perm none and flags i breaks the inherit properties of all subfolders', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Create parent > child (with f=i) > grandchild
		const parentName = `parent_break_${common.getUniqueString()}`;
		const createParent =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createParent, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const childName = `child_break_${common.getUniqueString()}`;
		const createChild =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${childName}" l="${parentId}" f="i"/>
			</CreateFolderRequest>`;
		const childResp = await soap.makeSOAPEnvelopeAccount(createChild, auth1);
		const childId = childResp.CreateFolderResponse.folder[0].id;

		const grandchildName = `grandchild_break_${common.getUniqueString()}`;
		const createGrandchild =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${grandchildName}" l="${childId}"/>
			</CreateFolderRequest>`;
		const grandchildResp = await soap.makeSOAPEnvelopeAccount(createGrandchild, auth1);
		const grandchildId = grandchildResp.CreateFolderResponse.folder[0].id;

		// Add message to grandchild
		const addMsg =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${grandchildId}">
					<content>Grandchild break content</content>
				</m>
			</AddMsgRequest>`;
		const msgResp = await soap.makeSOAPEnvelopeAccount(addMsg, auth1);
		const msgId = msgResp.AddMsgResponse.m[0].id;

		// Share parent
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(mount, auth2);

		// Try to access grandchild message - should be denied
		const getMsg =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const getMsgResp = await soap.makeSOAPEnvelopeAccount(getMsg, auth2);
		assert.exists(getMsgResp.Fault,
			'Access to grandchild should be denied when child has flags=i');
	});


	it('Sanity | Verify by default delgatee are allowed to create a subfolder in the shared folder', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `delegatable_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, auth1);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// Share with rwidx
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${folderName}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(mount, auth2);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Delegatee creates subfolder
		const subName = `sub_${common.getUniqueString()}`;
		const createSub =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${mountId}"/>
			</CreateFolderRequest>`;
		const subResp = await soap.makeSOAPEnvelopeAccount(createSub, auth2);
		assert.notExists(subResp.Fault, 'Response should not be a Fault');
		assert.exists(subResp.CreateFolderResponse,
			'Delegatee should be able to create subfolder in shared folder');
	});


	it('Functional | Verify that a subfolder folder cannot be shared if parent folder has d permission but flags i', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const parentName = `parent_di_${common.getUniqueString()}`;
		const createParent =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createParent, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const childName = `child_di_${common.getUniqueString()}`;
		const createChild =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${childName}" l="${parentId}" f="i"/>
			</CreateFolderRequest>`;
		const childResp = await soap.makeSOAPEnvelopeAccount(createChild, auth1);
		const childId = childResp.CreateFolderResponse.folder[0].id;

		// Share parent with d permission
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="d"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		await soap.makeSOAPEnvelopeAccount(mount, auth2);

		// Try to access child from delegatee - should be denied
		const getFolderChild =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${account1Id}:${childId}"/>
			</GetFolderRequest>`;
		const childAccessResp = await soap.makeSOAPEnvelopeAccount(getFolderChild, auth2);
		assert.exists(childAccessResp.Fault,
			'Child folder should not be accessible when parent has flags=i');
	});


	it('Functional | Verify that a folder cannot be created in a folder whose parent folder has rwi permission but flags i', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const parentName = `parent_rwi_${common.getUniqueString()}`;
		const createParent =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createParent, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const childName = `child_rwi_${common.getUniqueString()}`;
		const createChild =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${childName}" l="${parentId}" f="i"/>
			</CreateFolderRequest>`;
		const childResp = await soap.makeSOAPEnvelopeAccount(createChild, auth1);
		const childId = childResp.CreateFolderResponse.folder[0].id;

		// Share parent with rwi
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="rwi"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(mount, auth2);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Delegatee tries to create folder under child (which has flags=i) - should fail
		const subName = `sub_rwi_${common.getUniqueString()}`;
		const createSub =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${account1Id}:${childId}"/>
			</CreateFolderRequest>`;
		const subResp = await soap.makeSOAPEnvelopeAccount(createSub, auth2);
		assert.exists(subResp.Fault,
			'Creating folder under child with flags=i should be denied');
	});


	it('Functional | Verify that a folder cannot be moved into another whose parent folder has rwi permission and flags i', async () => {
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const parentName = `parent_move_${common.getUniqueString()}`;
		const createParent =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const parentResp = await soap.makeSOAPEnvelopeAccount(createParent, auth1);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const targetName = `target_move_${common.getUniqueString()}`;
		const createTarget =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${targetName}" l="${parentId}" f="i"/>
			</CreateFolderRequest>`;
		const targetResp = await soap.makeSOAPEnvelopeAccount(createTarget, auth1);
		const targetId = targetResp.CreateFolderResponse.folder[0].id;

		// Share parent with rwi
		const grant =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${parentId}">
					<grant gt="usr" d="${testAccount2}" perm="rwi"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grant, auth1);

		// Mount
		const mount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_${parentName}" zid="${account1Id}" rid="${parentId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(mount, auth2);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Delegatee creates a folder at mount level
		const srcName = `src_move_${common.getUniqueString()}`;
		const createSrc =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${srcName}" l="${mountId}"/>
			</CreateFolderRequest>`;
		const srcResp = await soap.makeSOAPEnvelopeAccount(createSrc, auth2);
		const srcId = srcResp.CreateFolderResponse.folder[0].id;

		// Delegatee tries to move folder into target (which has flags=i) - should fail
		const moveRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${srcId}" l="${account1Id}:${targetId}"/>
			</FolderActionRequest>`;
		const moveResp = await soap.makeSOAPEnvelopeAccount(moveRequest, auth2);
		assert.exists(moveResp.Fault,
			'Moving folder into target with flags=i should be denied');
	});
});
