import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Bugs > Bugs', function () {
	let testAccount2, testAccount3;
	let auth2, auth3;
	let account2Id;

	before(async function () {
		testAccount2 = `bug23590_2_${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `bug23590_3_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

		account2Id = res2.accountId;

		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
		auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify key grantee type for folder ACL', async function () {
		// 1. Create subfolder of inbox for account2
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolder2 = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth2);
		const inboxId2 = getFolder2.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const subFolderName = `sub_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subFolderName}" l="${inboxId2}"/>
			</CreateFolderRequest>`;
		const createResp2 = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth2);
		const subFolderId = createResp2.CreateFolderResponse.folder[0].id;

		// 2. Add test mails
		const msgSubjectInbox = `InboxMsg_${common.getUniqueString()}`;
		const msgSubjectSub = `SubMsg_${common.getUniqueString()}`;

		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId2}">
					<content>Subject: ${msgSubjectInbox}\r\n\r\nContent</content>
				</m>
			</AddMsgRequest>`;
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth2);

		const addMsgRequest2 =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${subFolderId}">
					<content>Subject: ${msgSubjectSub}\r\n\r\nContent</content>
				</m>
			</AddMsgRequest>`;
		await soap.makeSOAPEnvelopeAccount(addMsgRequest2, auth2);

		// 3. Share Inbox with inh="1" with account3
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId2}">
					<grant gt="usr" inh="1" perm="r" d="${testAccount3}"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth2);

		// 4. Authenticate as account3 and create mountpoint
		const mountName = `mount_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account2Id}" rid="${inboxId2}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth3);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 5. Do search for account2's inbox mail
		const searchRequest =
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>${msgSubjectInbox} (inid:${mountId} OR inid:"${account2Id}:${inboxId2}" OR is:local)</query>
			</SearchRequest>`;
		const searchResp1 = await soap.makeSOAPEnvelopeAccount(searchRequest, auth3);

		assert.exists(searchResp1.SearchResponse.m,
			'Should find message in shared inbox');
		assert.equal(searchResp1.SearchResponse.m[0].su, msgSubjectInbox);

		// 6. Do search for account2's subfolder mail
		const searchRequest2 =
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>${msgSubjectSub} (inid:${mountId} OR inid:"${account2Id}:${subFolderId}" OR is:local)</query>
			</SearchRequest>`;
		const searchResp2 = await soap.makeSOAPEnvelopeAccount(searchRequest2, auth3);

		assert.exists(searchResp2.SearchResponse.m,
			'Should find message in shared subfolder');
		assert.equal(searchResp2.SearchResponse.m[0].su, msgSubjectSub);
	});

	let testAccount1;
	let auth1;
	let account1Id;

	before(async function () {
		testAccount1 = `bug30049_1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `bug30049_2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		account1Id = res1.accountId;
		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
	});


	it('Sanity | Verify Searching Shared Folders that have subfolder works fine', async function () {
		// Create folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `folder_key_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add Message
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>test content</content>
				</m>
			</AddMsgRequest>`;
		await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);

		// Share with gt="key"
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="key" perm="r" d="${testAccount2}"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);
	});

});
