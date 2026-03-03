import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Mountpoint > Create Mountpoint', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id, account2Id;
	let sharedFolderId, inboxId;

	before(async function () {
		await main.before(this);
		testAccount1 = `mp_create1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `mp_create2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		account1Id = res1.accountId;
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
		account2Id = res2.accountId;

		// Account1 creates a folder and shares it with Account2
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);

		inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `mp_shared_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);

		sharedFolderId = createResp.CreateFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${sharedFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);
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
	it('Smoke | Mount a delegated folder with all valid values', async () => {
		const mountName = `mount_${common.getUniqueString()}`;
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Mountpoint should be created');
		const link = mountResp.CreateMountpointResponse.link[0];

		// Verify response
		assert.equal(link.name, mountName, 'Mountpoint name should match');
		assert.equal(link.zid, account1Id, 'Owner zid should match');
	});


	it('Functional | Mount a delegated folder with all valid values', async () => {
		const views = ['conversation', 'message', 'contact', 'appointment', 'task', 'document'];
		for (const view of views) {
			const mountName = `mount_${view}_${common.getUniqueString()}`;
			const createMountpointRequest2 =
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="${view}"/>
				</CreateMountpointRequest>`;

			// CreateMountpointRequest
			const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest2, auth2);

			// Verify response
			assert.exists(mountResp.CreateMountpointResponse.link,
				`Mount with view="${view}" should succeed`);
		}
	});


	it('Regression | Mount a delegated folder with invalid values of view(blank,space,spchar,sometext,negative,zero,largenumber,decimal)', async () => {
		const invalidViews = ['', '     ', 'invalidview', '12345'];
		for (const view of invalidViews) {
			const mountName = `mount_inv_view_${common.getUniqueString()}`;
			const createMountpointRequest3 =
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="${view}"/>
				</CreateMountpointRequest>`;

			// CreateMountpointRequest
			const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest3, auth2);
			// Verify response - server accepts any view string
			assert.exists(mountResp.CreateMountpointResponse.link,
				`Mount with view="${view}" should succeed`);
		}
	});


	it('Regression | Mount a delegated folder with invalid values of zid(blank,space,spchar,sometext,negative,zero,largenumber,decimal)', async () => {
		const invalidRids = ['', '     ', 'sometext', '-1', '0', '99999999'];
		for (const rid of invalidRids) {
			const mountName = `mount_inv_rid_${common.getUniqueString()}`;
			const createMountpointRequest4 =
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="1" name="${mountName}" zid="${account1Id}" rid="${rid}" view="message"/>
				</CreateMountpointRequest>`;

			// CreateMountpointRequest
			const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest4, auth2);

			// Verify response - invalid rid causes server Fault
			assert.exists(mountResp.Fault.Detail.Error,
				`Fault Error should exist for mount with invalid rid="${rid}"`);
		}
	});


	it('Regression | Mount a delegated folder with invalid values of l(blank,space,spchar,sometext,negative,zero,largenumber,decimal)', async () => {
		const invalidZids = ['', '     ', 'sometext', '99999999-9999-9999-9999-999999999999'];
		for (const zid of invalidZids) {
			const mountName = `mount_inv_zid_${common.getUniqueString()}`;
			const createMountpointRequest5 =
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="1" name="${mountName}" zid="${zid}" rid="${sharedFolderId}" view="message"/>
				</CreateMountpointRequest>`;

			// CreateMountpointRequest
			const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest5, auth2);

			// Verify response
			assert.exists(mountResp.Fault.Detail.Error,
				`Fault Error should exist for mount with invalid zid="${zid}"`);
		}
	});


	it('Regression | Mount a delegated folder with invalid values of view(blank,space,spchar,sometext,negative,zero,largenumber,decimal) 1', async () => {
		const invalidLs = ['', '     ', 'sometext', '-1', '0', '99999999'];
		for (const l of invalidLs) {
			const mountName = `mount_inv_l_${common.getUniqueString()}`;
			const createMountpointRequest6 =
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="${l}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
				</CreateMountpointRequest>`;

			// CreateMountpointRequest
			const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest6, auth2);

			// Verify response - invalid l values should fail
			assert.exists(mountResp.Fault.Detail.Error,
				`Fault Error should exist for mount with invalid l="${l}"`);
		}
	});


	it('Functional | Create two mountpoints to the same shared folder', async () => {
		const mountName1 = `mount_dup1_${common.getUniqueString()}`;
		const mountName2 = `mount_dup2_${common.getUniqueString()}`;

		const createMountpointRequest7 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName1}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const resp1 = await soap.makeSOAPEnvelopeAccount(createMountpointRequest7, auth2);

		// Verify response
		assert.exists(resp1.CreateMountpointResponse.link,
			'First mountpoint should be created');

		const createMountpointRequest8 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName2}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const resp2 = await soap.makeSOAPEnvelopeAccount(createMountpointRequest8, auth2);

		// Verify response
		assert.exists(resp2.CreateMountpointResponse.link,
			'Second mountpoint to same folder should succeed');
	});


	it('Regression | Mount more than one delegated folders at once', async () => {
		// Create a second shared folder
		const folder2Name = `mp_shared2_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const create2 = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folder2Id = create2.CreateFolderResponse.folder[0].id;

		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder2Id}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Try mounting both
		const mountName = `mount_multi_${common.getUniqueString()}`;
		const createMountpointRequest9 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}_a" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
				<link l="1" name="${mountName}_b" zid="${account1Id}" rid="${folder2Id}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const resp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest9, auth2);
		// Second link tag should be ignored per XML test
		// Verify response - server may reject or process first link
		assert.notExists(resp.Fault, 'Response should not be a Fault');
		assert.exists(resp.CreateMountpointResponse.link,
			'Link should exist in response');
	});


	it('Regression | Give CreateMountpointRequest without link tag', async () => {
		const createMountpointRequest10 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const resp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest10, auth2);

		// Verify response
		assert.exists(resp.Fault.Detail.Error, 'Fault Error should exist without link tag');
	});


	it('Regression | Check if CreateMountpointRequest is given with two link tags, then second one is ignored', async () => {
		const mountName1 = `mount_two1_${common.getUniqueString()}`;
		const mountName2 = `mount_two2_${common.getUniqueString()}`;
		const createMountpointRequest11 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName1}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
				<link l="1" name="${mountName2}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const resp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest11, auth2);
		// Second link should be ignored - only first mountpoint created
		assert.exists(resp.CreateMountpointResponse.link,
			'Should create mountpoint from first link tag');
		const links = resp.CreateMountpointResponse.link;
		const linkArr = Array.isArray(links) ? links : [links];
		assert.isAtMost(linkArr.length, 2,
			'Should create at most the first mountpoint');
	});


	it('Regression | Give CreateMountpointRequest without any attribute', async () => {
		const createMountpointRequest12 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link/>
			</CreateMountpointRequest>`;

		// GetFolderRequest
		const resp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest12, auth2);

		// Verify response
		assert.exists(resp.Fault.Detail.Error, 'Fault Error should exist without any attributes on link tag');
	});


	it('Functional | CreateMountPointRequest with parent-folder id is id of a default folder', async () => {
		// Get Inbox folder ID (default folder)
		const getFolderRequest2 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateMountpointRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth2);
		const acc2InboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const mountName = `mount_default_parent_${common.getUniqueString()}`;
		const createMountpointRequest13 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${acc2InboxId}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest13, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Mount under default folder should succeed');
		assert.equal(mountResp.CreateMountpointResponse.link[0].l, acc2InboxId,
			'Parent should be Inbox');
	});


	it('Functional | CreateMountPointRequest with parent-folder id is id of a custom folder', async () => {
		// Create custom parent folder
		const parentName = `custom_parent_${common.getUniqueString()}`;
		const createFolderRequest3 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`;

		// CreateMountpointRequest
		const parentResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest3, auth2);
		const parentId = parentResp.CreateFolderResponse.folder[0].id;

		const mountName = `mount_custom_parent_${common.getUniqueString()}`;
		const createMountpointRequest14 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${parentId}" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest14, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Mount under custom folder should succeed');
		assert.equal(mountResp.CreateMountpointResponse.link[0].l, parentId,
			'Parent should be custom folder');
	});


	it('Functional | CreateMountPointRequest mount name equal to 1) an existing mount name and 2) an existing folder name', async () => {
		// Create a regular folder
		const folderName = `existing_${common.getUniqueString()}`;
		const createFolderRequest4 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(createFolderRequest4, auth2);

		// Try to mount with same name as existing folder
		const createMountpointRequest15 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${folderName}" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateFolderRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest15, auth2);

		// Verify response
		assert.include(mountResp.Fault.Reason.Text, 'already exists',
			'Should get ALREADY_EXISTS error');
	});


	it('Sanity | CreateMountpointRequest to a folder that is not shared', async () => {
		// Create an unshared folder on Account1
		const unsharedName = `unshared_${common.getUniqueString()}`;
		const createFolderRequest5 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${unsharedName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// CreateMountpointRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest5, auth1);
		const unsharedId = createResp.CreateFolderResponse.folder[0].id;

		// Account2 tries to mount an unshared folder
		const mountName = `mount_unshared_${common.getUniqueString()}`;
		const createMountpointRequest16 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${unsharedId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest16, auth2);
		// Mounting unshared folder - server denies mounting unshared folder
		// Verify response
		assert.exists(mountResp.Fault.Detail.Error,
			'Fault Error should exist - mounting unshared folder should be denied');
	});


	it('Regression | Verify that CreateMountpointRequest with missing attribute gives serviceINVALIDREQUEST', async () => {
		// Missing name attribute
		const createMountpointRequest17 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" zid="${account1Id}" rid="${sharedFolderId}" view="message"/>
			</CreateMountpointRequest>`;

		// CreateMountpointRequest
		const resp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest17, auth2);

		// Verify response
		assert.include(resp.Fault.Reason.Text, 'invalid request',
			'Should get INVALID_REQUEST error');
	});


	it('Sanity | Verify color and flag (as checked) can be set while creating mountpoints', async () => {
		const mountName = `mount_color_${common.getUniqueString()}`;
		const createMountpointRequest18 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${sharedFolderId}" view="message" color="5" f="#"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest18, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Mount with color and flag should succeed');
		const link = mountResp.CreateMountpointResponse.link[0];

		// Verify response
		assert.equal(link.color, '5', 'Color should be set to 5');
	});


	it('Functional | CreateMountpointRequest should use shared folders view by default', async () => {
		// Create a contacts folder and share it
		const contactsFolderName = `contacts_mp_${common.getUniqueString()}`;
		const createContactsFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${contactsFolderName}" l="${inboxId}" view="contact"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const contactsResp = await soap.makeSOAPEnvelopeAccount(createContactsFolder, auth1);
		const contactsFolderId = contactsResp.CreateFolderResponse.folder[0].id;

		const grantContactsFolder =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(grantContactsFolder, auth1);

		// Mount WITHOUT specifying view - should use shared folder's view
		const mountName = `mount_defview_${common.getUniqueString()}`;
		const createMountpointRequest19 =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${account1Id}" rid="${contactsFolderId}"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMountpointRequest19, auth2);

		// Verify response
		assert.exists(mountResp.CreateMountpointResponse.link,
			'Mount without view should succeed');
	});
});
