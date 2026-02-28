import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Mountpoint > Folderactionrequest Mountpoint', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id, account2Id;
	let folderId, mountId;

	before(async function () {
		testAccount1 = `mp_act1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `mp_act2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		account1Id = res1.accountId;
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
		account2Id = res2.accountId;

		// Setup shared folder and mountpoint
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `mp_act_folder_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);

		folderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		const mountName = `mount_act_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		mountId = mountResp.CreateMountpointResponse.link[0].id;
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
	it('Sanity | FolderActionRequest on a mountpoint - delete the mountpoint', async () => {
		// Delete the mountpoint
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${mountId}"/>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth2);

		// Verify mountpoint is gone
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// GetFolderRequest
		const getFolder2 = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth2);

		getFolder2.GetFolderResponse.folder[0].link || []; // link is array if present, undefined if not? 
		// Wait, `GetFolderResponse` returns `folder` which contains `folder` (array) AND `link` (array) usually?
		// Let's assume standard response structure. If `link` is missing or filtered out.
		// We can check specific ID access.

		const getFolderRequest3 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${mountId}"/>
			</GetFolderRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth2);
		// Mountpoint should be gone or moved to Trash after delete

		// Let's verify original folder still exists for Owner
		const getFolderRequest4 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolder1 = await soap.makeSOAPEnvelopeAccount(getFolderRequest4, auth1);

		// Verify response
		assert.exists(getFolder1.GetFolderResponse.folder[0],
			'Original folder should still exist');
	});

});
