import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Briefcase > Mountpoint > Create Mountpoint', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	let account1Token;
	let account2Name;
	let account2Token;
	let account3Name;
	let account3Id;
	let account4Name;
	let account4Token;
	let briefcaseFolderId;
	let bcFolder1Id;
	let account2BriefcaseId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Create account3 and account4 for non-shared folder test
		account3Name = 'acct3.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes3.CreateAccountResponse, 'Should create account3');

		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		account3Id = acct3.id;

		account4Name = 'acct4.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes4.CreateAccountResponse, 'Should create account4');

		// Get auth tokens
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes1.AuthResponse, 'AuthResponse should exist for account1');

		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes2.AuthResponse, 'AuthResponse should exist for account2');

		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		const authRes4 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes4.AuthResponse, 'AuthResponse should exist for account4');

		account4Token = Array.isArray(authRes4.AuthResponse.authToken)
			? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
			: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;

		// Get account1's Briefcase folder id
		const folderRes1 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const root1 = Array.isArray(folderRes1.GetFolderResponse.folder)
			? folderRes1.GetFolderResponse.folder[0] : folderRes1.GetFolderResponse.folder;
		const subfolders1 = Array.isArray(root1.folder) ? root1.folder : [root1.folder];
		const briefcase1 = subfolders1.find(f => f && f.name === 'Briefcase');
		briefcaseFolderId = briefcase1.id;

		// Create a sub-folder under account1's Briefcase and share it with account2
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="BriefcaseFolder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create sub-folder under Briefcase');
		const createdFolder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		bcFolder1Id = createdFolder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${bcFolder1Id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Share account1's Briefcase folder with account2 (for smoke test)
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseFolderId}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Get account2's Briefcase folder id
		const folderRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		const root2 = Array.isArray(folderRes2.GetFolderResponse.folder)
			? folderRes2.GetFolderResponse.folder[0] : folderRes2.GetFolderResponse.folder;
		const subfolders2 = Array.isArray(root2.folder) ? root2.folder : [root2.folder];
		const briefcase2 = subfolders2.find(f => f && f.name === 'Briefcase');
		account2BriefcaseId = briefcase2.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Mount a delegated folder with all valid values', async () => {
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="Mounted.${common.getUniqueString()}" view="document" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'link should have an id');
	});


	it('Regression | Mount a delegated folder with invalid values of view (blank, space, spchar, sometext, negative, zero, largenumber, decimal)', async () => {
		const invalidViews = [
			'', '            ', ':/.;<*\'\'',
			'thisisinvalidtexttocheckmountpoint', '-1', '0', '1234567890', '12.34'
		];

		for (const view of invalidViews) {
			const mountRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" view="${view}" rid="${bcFolder1Id}" zid="${account1Id}"/>
				</CreateMountpointRequest>`, account2Token
			);
			if (mountRes.Fault) {
				assert.match(mountRes.Fault.Detail.Error.Code,
					/service\.PARSE_ERROR|service\.INVALID_REQUEST/,
					'Should return PARSE_ERROR or INVALID_REQUEST for view: ' + view);
			} else {
				assert.exists(mountRes.CreateMountpointResponse,
					'CreateMountpointResponse should exist for view: ' + view);
				const link = Array.isArray(mountRes.CreateMountpointResponse.link)
					? mountRes.CreateMountpointResponse.link[0]
					: mountRes.CreateMountpointResponse.link;
				assert.notEqual(link.view, view,
					'view attr should not match invalid value: ' + view);
			}
		}
	});


	it('Regression | Verify that with invalid (blank, space, spchar, sometext, negative, zero, largenumber, decimal) values of rid, a delegated folder cannot be mounted', async () => {
		const invalidRids = [
			'', '            ', ':/.;<*\'\'',
			'thisisinvalidtexttocheckmountpoint', '-1', '0', '12.34'
		];

		for (const rid of invalidRids) {
			const mountRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" rid="${rid}" view="document" zid="${account1Id}"/>
				</CreateMountpointRequest>`, account2Token
			);
			assert.exists(mountRes.Fault, 'Should return Fault for rid: ' + rid);
			assert.match(mountRes.Fault.Detail.Error.Code,
				/service\.INVALID_REQUEST|service\.PARSE_ERROR/,
				'Should return INVALID_REQUEST or PARSE_ERROR for rid: ' + rid);
		}
	});


	it('Regression | Mount a delegated folder with invalid values of zid (blank, space, spchar, sometext, negative, zero, largenumber, decimal)', async () => {
		const invalidZids = [
			'', '            ', ':/.;<*\'\'',
			'thisisinvalidtexttocheckmountpoint', '-19573920374930', '0',
			'1234567890', '12.34'
		];

		for (const zid of invalidZids) {
			const mountRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" zid="${zid}" rid="${bcFolder1Id}" view="document"/>
				</CreateMountpointRequest>`, account2Token
			);
			assert.exists(mountRes.Fault, 'Should return Fault for zid: ' + zid);
			assert.match(mountRes.Fault.Detail.Error.Code,
				/account\.NO_SUCH_ACCOUNT|service\.PARSE_ERROR|mail\.NO_SUCH_FOLDER/,
				'Should return NO_SUCH_ACCOUNT, PARSE_ERROR, or NO_SUCH_FOLDER for zid: ' + zid);
		}
	});


	it('Regression | Mount a delegated briefcase folder with invalid values of l (blank, space, spchar, sometext, negative, zero, largenumber, decimal)', async () => {
		const invalidLValues = [
			{ l: '', code: 'service.INVALID_REQUEST' },
			{ l: '            ', code: 'service.INVALID_REQUEST' },
			{ l: ':/.;<*\'\'', code: 'service.INVALID_REQUEST|service.PARSE_ERROR' },
			{ l: 'thisisinvalidtexttocheckmountpoint', code: 'service.INVALID_REQUEST' },
			{ l: '-1', code: 'mail.NO_SUCH_FOLDER' },
			{ l: '0', code: 'mail.NO_SUCH_ITEM' },
			{ l: '1234567890', code: 'mail.NO_SUCH_ITEM' },
			{ l: '12.34', code: 'service.INVALID_REQUEST' }
		];

		for (const { l, code } of invalidLValues) {
			const mountRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link zid="${account1Id}" name="mount.${common.getUniqueString()}" l="${l}" rid="${bcFolder1Id}" view="document"/>
				</CreateMountpointRequest>`, account2Token
			);
			assert.exists(mountRes.Fault, 'Should return Fault for l: ' + l);
			assert.match(mountRes.Fault.Detail.Error.Code,
				new RegExp(code.replace(/\./g, '\\.')),
				'Should return ' + code + ' for l: ' + l);
		}
	});


	it('Functional | Create two mountpoints to the same shared briefcase folder', async () => {
		// Create another folder under account1's Briefcase and share it
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="BCFolder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create sub-folder');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const bcFolder2Id = folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${bcFolder2Id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rw"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Mountpoint 1
		const mountName1 = 'mount.' + common.getUniqueString();
		const mountRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="${mountName1}" view="document" rid="${bcFolder2Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes1.CreateMountpointResponse,
			'First CreateMountpointResponse should exist');
		const link1 = Array.isArray(mountRes1.CreateMountpointResponse.link)
			? mountRes1.CreateMountpointResponse.link[0]
			: mountRes1.CreateMountpointResponse.link;
		const mount1Id = link1.id;

		// Mountpoint 2
		const mountName2 = 'mount.' + common.getUniqueString();
		const mountRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="${mountName2}" view="document" rid="${bcFolder2Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes2.CreateMountpointResponse,
			'Second CreateMountpointResponse should exist');
		const link2 = Array.isArray(mountRes2.CreateMountpointResponse.link)
			? mountRes2.CreateMountpointResponse.link[0]
			: mountRes2.CreateMountpointResponse.link;
		assert.notEqual(link2.id, mount1Id,
			'Second mountpoint should have a different id');

		// Verify both mountpoints exist
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.exists(getFolderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const rootFolder = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		assert.exists(rootFolder, 'folder should exist');
	});


	it('Regression | Mount more than one delegated briefcase folders at once', async () => {
		// Create another folder under account1's Briefcase and share it
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create sub-folder');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const bcFolder3Id = folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${bcFolder3Id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rw"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Try mounting with comma-separated rid values
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" view="document" rid="${bcFolder1Id},${bcFolder3Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.Fault, 'Should return Fault for comma-separated rid');
		assert.include(mountRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Regression | Verify that CreateMountpointRequest with missing attribute gives service.INVALID_REQUEST', async () => {
		// Without l attribute
		const mountRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link name="mount.${common.getUniqueString()}" view="document" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes1.Fault, 'Should return Fault without l');
		assert.include(mountRes1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST without l');

		// Without name attribute
		const mountRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" view="document" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes2.Fault, 'Should return Fault without name');
		assert.include(mountRes2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST without name');

		// Without view attribute (optional - should succeed)
		const mountRes3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes3.CreateMountpointResponse,
			'CreateMountpointResponse should exist without view (optional)');

		// Without rid attribute
		const mountRes4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" view="document" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes4.Fault, 'Should return Fault without rid');
		assert.include(mountRes4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST without rid');

		// Without zid attribute
		const mountRes5 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" view="document" rid="${bcFolder1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes5.Fault, 'Should return Fault without zid');
		assert.include(mountRes5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST without zid');
	});


	it('Regression | Give CreateMountpointRequest without link tag', async () => {
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.Fault, 'Should return Fault without link tag');
		assert.include(mountRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Regression | Check if CreateMountpointRequest is given with two link tags, then second one is ignored', async () => {
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="link1" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
				<link l="${account2BriefcaseId}" name="link2" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		assert.equal(link.name, 'link1', 'Only first link should be created');
	});


	it('Regression | Give CreateMountpointRequest without any attribute', async () => {
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.Fault, 'Should return Fault without any attribute');
		assert.include(mountRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Functional | CreateMountPointRequest with parent-folder id is id of a custom folder', async () => {
		// Create a custom folder under account2's Briefcase
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${account2BriefcaseId}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create custom folder');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;

		// Mount into the custom folder
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${folder.id}" name="mount.${common.getUniqueString()}" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
	});


	it('Functional | CreateMountPointRequest mount name equal to 1) an existing mount name and 2) an existing briefcase folder name', async () => {
		const folderName = 'folder.' + common.getUniqueString();
		const mountName = 'mount.' + common.getUniqueString();

		// Create a briefcase folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${account2BriefcaseId}" name="${folderName}"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create folder');

		// Create a mountpoint
		const mountRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="${mountName}" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes1.CreateMountpointResponse,
			'First mountpoint should be created');

		// Try creating a mountpoint with the same mount name
		const mountRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="${mountName}" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes2.Fault, 'Should return Fault for duplicate mount name');
		assert.include(mountRes2.Fault.Detail.Error.Code, 'mail.ALREADY_EXISTS',
			'Should return ALREADY_EXISTS for duplicate mount name');

		// Try creating a mountpoint with the folder name
		const mountRes3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="${folderName}" view="appointment" rid="${bcFolder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes3.Fault, 'Should return Fault for existing folder name');
		assert.include(mountRes3.Fault.Detail.Error.Code, 'mail.ALREADY_EXISTS',
			'Should return ALREADY_EXISTS for existing folder name');
	});


	it('Functional | Verify color and flag (as checked) can be set while creating mountpoints', async () => {
		// Create a folder and share it
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create folder');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder.id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rw"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Mount with color and flag
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" view="appointment" rid="${folder.id}" zid="${account1Id}" color="3" flag="urgent"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		assert.equal(String(link.color), '3', 'color should be 3');
	});


	it('Functional | CreateMountpointRequest should use shared briefcase folders view by default', async () => {
		// Create a folder with view="document" and share it
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="folder${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes.CreateFolderResponse,
			'Should create folder with view=document');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder.id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rw"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Mount without specifying view - should inherit "document"
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" rid="${folder.id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		assert.equal(link.view, 'document',
			'view should default to shared folder view (document)');

		// Repeat with another folder
		const createFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseFolderId}" name="folder${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.exists(createFolderRes2.CreateFolderResponse,
			'Should create second folder with view=document');
		const folder2 = Array.isArray(createFolderRes2.CreateFolderResponse.folder)
			? createFolderRes2.CreateFolderResponse.folder[0]
			: createFolderRes2.CreateFolderResponse.folder;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder2.id}" op="grant">
					<grant gt="usr" d="${account2Name}" perm="rw"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		const mountRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="mount.${common.getUniqueString()}" rid="${folder2.id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.exists(mountRes2.CreateMountpointResponse,
			'Second CreateMountpointResponse should exist');
		const link2 = Array.isArray(mountRes2.CreateMountpointResponse.link)
			? mountRes2.CreateMountpointResponse.link[0]
			: mountRes2.CreateMountpointResponse.link;
		assert.equal(link2.view, 'document',
			'Second mount view should default to document');
	});


	it('Sanity | CreateMountpointRequest to a briefcase folder that is not shared', async () => {
		// Account4 tries to mount Account3's root folder (not shared)
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2BriefcaseId}" name="Mountpoint${common.getUniqueString()}" rid="1" zid="${account3Id}"/>
			</CreateMountpointRequest>`, account4Token
		);
		assert.exists(mountRes.Fault, 'Should return Fault for non-shared folder');
		assert.include(mountRes.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});
});
