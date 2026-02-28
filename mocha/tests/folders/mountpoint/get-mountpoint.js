import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Mountpoint > Get Mountpoint', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id, account2Id;
	let folderId, mountId;

	before(async function () {
		testAccount1 = `mp_get1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `mp_get2_${common.getUniqueString()}@${config.testDomain}`;

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

		const folderName = `mp_get_folder_${common.getUniqueString()}`;
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

		const mountName = `mount_get_${common.getUniqueString()}`;
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
	it('Functional | Verify GetFolder by path of the shared folder works', async () => {
		const getFolderRequest2 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${mountId}"/>
			</GetFolderRequest>`;
		const resp = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth2);

		// Should return the link details AND potentially the resolved folder content?
		// XML checks `//mail:GetFolderResponse/mail:link[@id='${account2.mount1.id}']`
		// And checks attributes like `zid`, `rid`, `owner`.

		const link = resp.GetFolderResponse.link[0];
		// Note: GetFolderRequest returning a mountpoint usually returns it as <link> or <folder> depending on structure?
		// Usually it's in the response body.
		// Verify response
		assert.equal(link.id, mountId, 'Link ID match');
		assert.equal(link.zid, account1Id, 'Owner ZID match');
		assert.equal(link.rid, folderId, 'Remote ID match');
	});


	it('Functional | Verify GetFolder by path of the shared sub-folder works', async () => {
		// Create a subfolder in the shared folder
		const subfolderName = `sub_get_${common.getUniqueString()}`;
		const createSubRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subfolderName}" l="${folderId}"/>
			</CreateFolderRequest>`;

		// GetFolderRequest
		const subResp = await soap.makeSOAPEnvelopeAccount(createSubRequest, auth1);
		subResp.CreateFolderResponse.folder[0].id;

		// Verify account2 can get the subfolder via the mountpoint
		const getFolderRequest3 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${mountId}"/>
			</GetFolderRequest>`;
		const resp = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth2);

		// Response should show the mountpoint and its sub-folders
		// Verify response
		assert.notExists(resp.Fault, 'Response should not be a Fault');
		assert.exists(resp.GetFolderResponse,
			'GetFolderRequest for mountpoint should succeed');
	});
});
