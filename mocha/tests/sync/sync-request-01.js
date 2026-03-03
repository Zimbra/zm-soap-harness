import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Sync Request 01', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null;
	let inboxId = null, trashId = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		await soap.getAccountAuthToken(account2Email);

		// Get standard folder ids
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		inboxId = folders[0].folder.find(f => f.name === 'Inbox').id;
		trashId = folders[0].folder.find(f => f.name === 'Trash').id;
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

	// Helper: get sync token
	async function getSyncToken(authToken) {
		// SyncRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse.token;
	}

	// Helper: sync with token
	async function syncWithToken(token, authToken) {

		// SyncRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token}"/>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse;
	}

	// Tests - Folder operations
	it('Smoke | SyncRequest basic', async () => {
		// SyncRequest
		const syncRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes.Fault, 'Response should not be a Fault');
		assert.exists(syncRes.SyncResponse.token, 'SyncResponse should have a token');
	});


	it('Sanity | SyncRequest with the previous token on a new mailbox (Sync Request without any change in account state)', async () => {
		// SyncRequest
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// SyncRequest
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse.token, 'SyncResponse should return a valid token');
	});


	it('Functional | SyncRequest after creating a new folder', async () => {
		const token = await getSyncToken(accountAuthToken);
		const folderName = `folder${common.getUniqueString()}`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);

		// Verify response
		assert.exists(matchFolder, 'New folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		// FolderActionRequest
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newName}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);

		// Verify response
		assert.exists(matchFolder, 'Renamed folder should appear in SyncResponse');
		assert.equal(matchFolder.name, newName, 'Folder name should be updated');
	});


	it('Functional | SyncRequest after deleting a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		// FolderActionRequest
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');

		// Verify response
		assert.include(deletedIds, folderId,
			'Deleted ids should contain folder id');
	});


	it('Functional | SyncRequest after moving a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;
		const parentName = `parent${common.getUniqueString()}`;

		// CreateFolderRequest
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createParent.Fault, 'Response should not be a Fault');
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		// FolderActionRequest
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="${parentId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);

		// Verify response
		assert.exists(matchFolder, 'Moved folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after creating a new sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;

		// CreateFolderRequest
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createParent.Fault, 'Response should not be a Fault');
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const subName = `sub${common.getUniqueString()}`;

		// CreateFolderRequest
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createSub.Fault, 'Response should not be a Fault');
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);

		// Verify response
		assert.exists(matchFolder, 'New sub-folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;

		// CreateFolderRequest
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;

		// CreateFolderRequest
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${subId}" name="${newName}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);

		// Verify response
		assert.exists(matchFolder, 'Renamed sub-folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;

		// CreateFolderRequest
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;

		// CreateFolderRequest
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${subId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');

		// Verify response
		assert.include(deletedIds, subId,
			'Deleted ids should contain sub-folder id');
	});


	it('Functional | SyncRequest after moving a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;

		// CreateFolderRequest
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;

		// CreateFolderRequest
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${subId}" l="1"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);

		// Verify response
		assert.exists(matchFolder, 'Moved sub-folder should appear in SyncResponse');
	});


	// Tests - Search folder operations
	it('Functional | SyncRequest after creating a new search folder', async () => {
		const token = await getSyncToken(accountAuthToken);
		const searchName = `search${common.getUniqueString()}`;

		// CreateSearchFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncSearches = Array.isArray(syncData.search)
			? syncData.search : (syncData.search ? [syncData.search] : []);
		const match = syncSearches.find(s => s.id === searchId);

		// Verify response
		assert.exists(match, 'New search folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a search folder', async () => {
		const searchName = `search${common.getUniqueString()}`;

		// CreateSearchFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const token = await getSyncToken(accountAuthToken);

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${searchId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');

		// Verify response
		assert.include(deletedIds, searchId,
			'Deleted ids should contain search folder id');
	});


	it('Functional | SyncRequest after modifying a search folder', async () => {
		const searchName = `search${common.getUniqueString()}`;

		// CreateSearchFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ModifySearchFolderRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ModifySearchFolderRequest xmlns="urn:zimbraMail">
				<search id="${searchId}" query="subject:modified" types="message"/>
			</ModifySearchFolderRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncSearches = Array.isArray(syncData.search)
			? syncData.search : (syncData.search ? [syncData.search] : []);
		const match = syncSearches.find(s => s.id === searchId);

		// Verify response
		assert.exists(match, 'Modified search folder should appear in SyncResponse');
	});


	// Tests - Tag operations
	it('Functional | SyncRequest after creating a new tag', async () => {
		const token = await getSyncToken(accountAuthToken);
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'New tag should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		// TagActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name="${newName}"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'Renamed tag should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		// TagActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');

		// Verify response
		assert.include(deletedIds, tagId,
			'Deleted ids should contain tag id');
	});


	it('Functional | SyncRequest after changing color of a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		// TagActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="5"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'Color-changed tag should appear in SyncResponse');
	});


	// Tests - Contact operations
	it('Functional | SyncRequest after creating a contact', async () => {
		const token = await getSyncToken(accountAuthToken);

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'New contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after modifying a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ModifyContactRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${contactId}">
					<a n="lastName">modified${common.getUniqueString()}</a>
				</cn>
			</ModifyContactRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Modified contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');

		// Verify response
		assert.include(deletedIds, contactId,
			'Deleted ids should contain contact id');
	});


	it('Functional | SyncRequest after tagging a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Tagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after untagging a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Untagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after flagging a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Flagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after unflagging a contact', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="!flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Unflagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to trash', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${trashId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Moved contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to inbox', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${inboxId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Contact moved to inbox should appear in SyncResponse');
	});
});
