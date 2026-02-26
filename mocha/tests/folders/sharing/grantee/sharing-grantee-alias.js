import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Grantee > Sharing Grantee Alias', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id, account2Id;
	let alias;

	before(async function () {
		testAccount1 = `grant_alias1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `grant_alias2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

		account1Id = res1.accountId;
		account2Id = res2.accountId;

		// Create Alias
		alias = `alias_${common.getUniqueString()}@${config.testDomain}`;
		const addAccountAliasRequest =
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${alias}</alias>
			</AddAccountAliasRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addAccountAliasRequest, adminAuth);
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
	it('Smoke | Share a folder to an alias. Verify that the account has access.', async () => {
		// Setup Folder
		const getFolderRequest = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `grant_alias_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Alias
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${alias}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify Account2 (owner of alias) can access
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_alias" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Alias owner should be able to mount folder');
	});


	it('Sanity | Unshare a folder to an alias. Verify that the account no longer has access.', async () => {
		// Create folder
		const getFolderRequest2 = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `revoke_alias_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Add a message
		const addMsgRequest =
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Date: Mon, 1 Jan 2024 12:00:00 -0800
					From: foo@example.com
					To: bar@example.com
					Subject: test_revoke_alias
					MIME-Version: 1.0
					Content-Type: text/plain
					Test message for revoke alias test
				</content>
			</m>
			</AddMsgRequest>`;
		const addMsg = await soap.makeSOAPEnvelopeAccount(addMsgRequest, auth1);
		const msgId = addMsg.AddMsgResponse.m[0].id;

		// Share with Alias
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${alias}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Verify access works
		const getMsgRequest =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const accessCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest, auth2);
		assert.notExists(accessCheck.Fault,
			'Alias owner should have access before revoke');

		// Revoke the grant
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${account2Id}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Verify access denied
		const getMsgRequest2 =
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${account1Id}:${msgId}"/>
			</GetMsgRequest>`;
		const revokedCheck = await soap.makeSOAPEnvelopeAccount(getMsgRequest2, auth2);
		assert.exists(revokedCheck.Fault, 'Alias owner should be denied after revoke');
	});

});
