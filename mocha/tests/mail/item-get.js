import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Item Get', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Get Inbox by ID, path', async () => {
		// Create test account
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Get folders to find inbox ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const folders = folderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxFolder = subFolders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Inbox folder should exist');
		const inboxId = inboxFolder.id;

		// Get item by ID
		const getByIdRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${inboxId}"/>
			</GetItemRequest>`, account1AuthToken
		);

		// Verify GetItemResponse has folder details for ID lookup
		assert.notExists(getByIdRes.Fault, 'GetItemRequest by ID should not fault');
		const folderById = Array.isArray(getByIdRes.GetItemResponse.folder)
			? getByIdRes.GetItemResponse.folder[0] : getByIdRes.GetItemResponse.folder;
		assert.exists(folderById, 'GetItemResponse should contain folder');
		assert.equal(folderById.id, inboxId, 'Folder ID should match inbox ID');
		assert.equal(folderById.name, 'Inbox', 'Folder name should be Inbox');

		// Get item by path
		const getByPathRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item path="Inbox"/>
			</GetItemRequest>`, account1AuthToken
		);

		// Verify GetItemResponse has folder details for path lookup
		assert.notExists(getByPathRes.Fault, 'GetItemRequest by path should not fault');
		const folderByPath = Array.isArray(getByPathRes.GetItemResponse.folder)
			? getByPathRes.GetItemResponse.folder[0] : getByPathRes.GetItemResponse.folder;
		assert.exists(folderByPath, 'GetItemResponse should contain folder');
		assert.equal(folderByPath.id, inboxId, 'Folder ID should match inbox ID');
		assert.equal(folderByPath.name, 'Inbox', 'Folder name should be Inbox');
	});


	it('Sanity | GetItemRequest for shared calendar by ID, PATH', async () => {
		// Create test accounts
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id : createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1 and get calendar folder ID
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const folders = folderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const calendarFolder = subFolders.find(f => f.name === 'Calendar');
		assert.exists(calendarFolder, 'Calendar folder should exist');
		const calendarId = calendarFolder.id;

		// Grant read access to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calendarId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Login as account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get account2 calendar folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(folder2Res.Fault, 'GetFolderRequest should not fault');
		const folders2 = folder2Res.GetFolderResponse.folder;
		const rootFolder2 = Array.isArray(folders2) ? folders2[0] : folders2;
		const subFolders2 = Array.isArray(rootFolder2.folder) ? rootFolder2.folder : [rootFolder2.folder];
		const calendarFolder2 = subFolders2.find(f => f.name === 'Calendar');
		const calendar2Id = calendarFolder2.id;

		// Create mountpoint for shared calendar
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${calendar2Id}" name="user1s Calendar" view="appointment"
					rid="${calendarId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		const delegatedId = link.id;
		const shareName = link.name;

		// Get item by ID
		const getByIdRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${delegatedId}"/>
			</GetItemRequest>`, account2AuthToken
		);

		// Verify GetItemResponse has link/folder details for ID lookup
		assert.notExists(getByIdRes.Fault, 'GetItemRequest by ID should not fault');
		const linkById = getByIdRes.GetItemResponse.link
			? (Array.isArray(getByIdRes.GetItemResponse.link) ? getByIdRes.GetItemResponse.link[0] : getByIdRes.GetItemResponse.link)
			: (Array.isArray(getByIdRes.GetItemResponse.folder) ? getByIdRes.GetItemResponse.folder[0] : getByIdRes.GetItemResponse.folder);
		assert.exists(linkById, 'GetItemResponse should contain link or folder');
		assert.equal(linkById.id, delegatedId, 'Link ID should match delegated ID');

		// Get item by path
		const getByPathRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item path="Calendar/${shareName}"/>
			</GetItemRequest>`, account2AuthToken
		);

		// Verify GetItemResponse has link/folder details for path lookup
		assert.notExists(getByPathRes.Fault, 'GetItemRequest by path should not fault');
		const linkByPath = getByPathRes.GetItemResponse.link
			? (Array.isArray(getByPathRes.GetItemResponse.link) ? getByPathRes.GetItemResponse.link[0] : getByPathRes.GetItemResponse.link)
			: (Array.isArray(getByPathRes.GetItemResponse.folder) ? getByPathRes.GetItemResponse.folder[0] : getByPathRes.GetItemResponse.folder);
		assert.exists(linkByPath, 'GetItemResponse should contain link or folder');
		assert.equal(linkByPath.id, delegatedId, 'Link ID should match delegated ID');
	});
});
