import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 31113', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;

	before(async function () {
		await main.before(this);
		testAccount1 = `bug31113_1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `bug31113_2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		account1Id = res1.accountId;

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
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
	it('Create a folder, give read permissions', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// 1. Create Folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const rootId = getFolder.GetFolderResponse.folder[0].id;

		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${rootId}" name="${folderName}" view="document"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folder1Id = createResp.CreateFolderResponse.folder[0].id;

		// 2. Share with Account 2
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder1Id}" op="grant">
					<grant d="${testAccount2}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// 3. Login Account 2 and Mount
		const mountName = `mount_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" view="document" rid="${folder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link[0].id,
			'Mountpoint created');
	});

});
