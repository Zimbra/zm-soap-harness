import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Sync Request', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null, account2AuthToken = null;
	let inboxId = null, trashId = null, sentId = null, draftsId = null, junkId = null;

	before(async () => {
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get standard folder ids
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		inboxId = folders[0].folder.find(f => f.name === 'Inbox').id;
		trashId = folders[0].folder.find(f => f.name === 'Trash').id;
		sentId = folders[0].folder.find(f => f.name === 'Sent').id;
		draftsId = folders[0].folder.find(f => f.name === 'Drafts').id;
		junkId = folders[0].folder.find(f => f.name === 'Junk').id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Helper: get sync token
	async function getSyncToken(authToken) {
		const res = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', authToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse.token;
	}

	// Helper: sync with token
	async function syncWithToken(token, authToken) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token}"/>`, authToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse;
	}

	// Tests - Folder operations
	it('Smoke | SyncRequest basic', async () => {
		const syncRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(syncRes.Fault, 'Response should not be a Fault');
		assert.exists(syncRes.SyncResponse, 'SyncResponse should exist');
		assert.exists(syncRes.SyncResponse.token, 'SyncResponse should have a token');
	});


	it('Sanity | SyncRequest with the previous token on a new mailbox (Sync Request without any change in account state)', async () => {
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		assert.exists(syncRes2.SyncResponse.token, 'SyncResponse should return a valid token');
	});


	it('Functional | SyncRequest after creating a new folder', async () => {
		const token = await getSyncToken(accountAuthToken);
		const folderName = `folder${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);
		assert.exists(matchFolder, 'New folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newName}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);
		assert.exists(matchFolder, 'Renamed folder should appear in SyncResponse');
		assert.equal(matchFolder.name, newName, 'Folder name should be updated');
	});


	it('Functional | SyncRequest after deleting a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');
		assert.include(deletedIds, folderId,
			'Deleted ids should contain folder id');
	});


	it('Functional | SyncRequest after moving a folder', async () => {
		const folderName = `folder${common.getUniqueString()}`;
		const parentName = `parent${common.getUniqueString()}`;

		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createParent.Fault, 'Response should not be a Fault');
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${folderId}" l="${parentId}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === folderId);
		assert.exists(matchFolder, 'Moved folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after creating a new sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createParent.Fault, 'Response should not be a Fault');
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const subName = `sub${common.getUniqueString()}`;

		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createSub.Fault, 'Response should not be a Fault');
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);
		assert.exists(matchFolder, 'New sub-folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${subId}" name="${newName}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);
		assert.exists(matchFolder, 'Renamed sub-folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${subId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');
		assert.include(deletedIds, subId,
			'Deleted ids should contain sub-folder id');
	});


	it('Functional | SyncRequest after moving a sub-folder', async () => {
		const parentName = `parent${common.getUniqueString()}`;
		const createParent = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${parentName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const parentId = createParent.CreateFolderResponse.folder[0].id;

		const subName = `sub${common.getUniqueString()}`;
		const createSub = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subName}" l="${parentId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const subId = createSub.CreateFolderResponse.folder[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${subId}" l="1"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncFolders = Array.isArray(syncData.folder)
			? syncData.folder : (syncData.folder ? [syncData.folder] : []);
		const matchFolder = syncFolders.find(f => f.id === subId);
		assert.exists(matchFolder, 'Moved sub-folder should appear in SyncResponse');
	});


	// Tests - Search folder operations
	it('Functional | SyncRequest after creating a new search folder', async () => {
		const token = await getSyncToken(accountAuthToken);
		const searchName = `search${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncSearches = Array.isArray(syncData.search)
			? syncData.search : (syncData.search ? [syncData.search] : []);
		const match = syncSearches.find(s => s.id === searchId);
		assert.exists(match, 'New search folder should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a search folder', async () => {
		const searchName = `search${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${searchId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');
		assert.include(deletedIds, searchId,
			'Deleted ids should contain search folder id');
	});


	it('Functional | SyncRequest after modifying a search folder', async () => {
		const searchName = `search${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		const searchId = createRes.CreateSearchFolderResponse.search[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ModifySearchFolderRequest xmlns="urn:zimbraMail">
				<search id="${searchId}" query="subject:modified" types="message"/>
			</ModifySearchFolderRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncSearches = Array.isArray(syncData.search)
			? syncData.search : (syncData.search ? [syncData.search] : []);
		const match = syncSearches.find(s => s.id === searchId);
		assert.exists(match, 'Modified search folder should appear in SyncResponse');
	});


	// Tests - Tag operations
	it('Functional | SyncRequest after creating a new tag', async () => {
		const token = await getSyncToken(accountAuthToken);
		const tagName = `tag${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);
		assert.exists(match, 'New tag should appear in SyncResponse');
	});


	it('Functional | SyncRequest after renaming a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);
		const newName = `renamed${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name="${newName}"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);
		assert.exists(match, 'Renamed tag should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');
		assert.include(deletedIds, tagId,
			'Deleted ids should contain tag id');
	});


	it('Functional | SyncRequest after changing color of a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="5"/>
			</TagActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncTags = Array.isArray(syncData.tag)
			? syncData.tag : (syncData.tag ? [syncData.tag] : []);
		const match = syncTags.find(t => t.id === tagId);
		assert.exists(match, 'Color-changed tag should appear in SyncResponse');
	});


	// Tests - Contact operations
	it('Functional | SyncRequest after creating a contact', async () => {
		const token = await getSyncToken(accountAuthToken);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'New contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after modifying a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

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
		assert.exists(match, 'Modified contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after deleting a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const deleted = Array.isArray(syncData.deleted)
			? syncData.deleted : (syncData.deleted ? [syncData.deleted] : []);
		const deletedIds = deleted.map(d => d.ids || d.id || '').join(',');
		assert.include(deletedIds, contactId,
			'Deleted ids should contain contact id');
	});


	it('Functional | SyncRequest after tagging a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const tagName = `tag${common.getUniqueString()}`;
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Tagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after untagging a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const tagName = `tag${common.getUniqueString()}`;
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Untagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after flagging a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Flagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after unflagging a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="!flag" id="${contactId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Unflagged contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to trash', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${trashId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Moved contact should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to inbox', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${inboxId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Contact moved to inbox should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to sent folder', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${sentId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Contact moved to sent should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to drafts', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${draftsId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Contact moved to drafts should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to junk folder', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${junkId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);
		assert.exists(match, 'Contact moved to junk should appear in SyncResponse');
	});


	// Tests - Mail operations
	it('Functional | SyncRequest after tagging and untagging a mail from inbox', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const tagName = `tag${common.getUniqueString()}`;
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${msgId}" tag="${tagId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs1 = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs1.find(m => m.id === msgId),
			'Tagged message should appear in SyncResponse');

		const token2 = syncData.token;
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${msgId}" tag="${tagId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		const syncMsgs2 = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs2.find(m => m.id === msgId),
			'Untagged message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking the mail as flagged and unflagged', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		let syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Flagged message should appear in SyncResponse');

		const token2 = syncData.token;
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!flag" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Unflagged message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking the mail as read and unread', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		let syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Read message should appear in SyncResponse');

		const token2 = syncData.token;
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!read" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Unread message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to trash', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to trash should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to spam folder', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${junkId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to spam should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to drafts', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${draftsId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to drafts should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to sent folder', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${sentId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to sent should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to inbox folder', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Move to trash first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Move back to inbox
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${inboxId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to inbox should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking a mail as spam', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Spam-marked message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking it as not a spam 1', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Mark as spam first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Mark as not spam
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Not-spam message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking it as not a spam 2', async () => {
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Move to junk/spam
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${junkId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Mark as not spam (moves back to inbox)
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Not-spam (variant 2) message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after addition of mail', async () => {
		const token = await getSyncToken(accountAuthToken);

		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Subject: hello${common.getUniqueString()}

Content Text
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Added message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after saving the mail as draft', async () => {
		const token = await getSyncToken(accountAuthToken);

		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>Draft mail ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Draft content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(draftRes.Fault, 'Response should not be a Fault');
		const draftId = draftRes.SaveDraftResponse.m[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		assert.exists(syncMsgs.find(m => m.id === draftId),
			'Draft message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after creating an appointment', async () => {
		const token = await getSyncToken(accountAuthToken);

		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="Meeting${common.getUniqueString()}" loc="India">
						<s d="${new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
						<e d="${new Date(Date.now() + 7200000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Meeting content</content>
					</mp>
					<su>Test appointment ${common.getUniqueString()}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');
		const apptId = apptRes.CreateAppointmentResponse.calItemId;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncAppts = Array.isArray(syncData.appt)
			? syncData.appt : (syncData.appt ? [syncData.appt] : []);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		const found = syncAppts.find(a => a.id === apptId)
			|| syncMsgs.find(m => m.id === apptId);
		assert.exists(found,
			'Created appointment should appear in SyncResponse');
	});


	it('Functional | SyncRequest with previous token instead of current token', async () => {
		// Step 1: Get token A
		const tokenA = await getSyncToken(accountAuthToken);

		// Step 2: Add a message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Subject: tokenTest${common.getUniqueString()}

Content Text
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Step 3: Sync with token A to get token B
		const syncB = await syncWithToken(tokenA, accountAuthToken);
		assert.exists(syncB.token, 'Should get a new token B');

		// Step 4: Add a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		assert.notExists(contactRes.Fault, 'Response should not be a Fault');
		const contactId = contactRes.CreateContactResponse.cn[0].id;

		// Step 5: Sync with token A (should show both message and contact)
		const syncData = await syncWithToken(tokenA, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Message should appear when syncing with old token A');
		assert.exists(syncCns.find(c => c.id === contactId),
			'Contact should appear when syncing with old token A');
	});


	it('Regression | SyncRequest with the invalid numeric tokens (Negative, Zero, Decimal, Large Number)', async () => {
		// Negative token
		const negRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="-1" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(negRes.Fault, 'Negative token should not cause a Fault');
		assert.exists(negRes.SyncResponse.token, 'Should return a valid token');

		// Zero token
		const zeroRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="0" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(zeroRes.Fault, 'Zero token should not cause a Fault');
		assert.exists(zeroRes.SyncResponse.token, 'Should return a valid token');

		// Decimal token — should return INVALID_REQUEST
		const decRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="1.54" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.exists(decRes.Fault, 'Decimal token should return Fault');
		assert.include(decRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Large number token
		const largeRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="111222333" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(largeRes.Fault, 'Large number token should not cause a Fault');
		assert.exists(largeRes.SyncResponse.token, 'Should return a valid token');
	});


	it('Regression | SyncRequest with the invalid tokens (blank, spaces, sometext)', async () => {
		// Blank token — server treats as no-token sync (returns full SyncResponse)
		const blankRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		if (blankRes.Fault) {
			assert.include(blankRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Error code should be service.INVALID_REQUEST');
		} else {
			assert.exists(blankRes.SyncResponse, 'Blank token should return a valid SyncResponse');
		}

		// Spaces token
		const spaceRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="        " xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.exists(spaceRes.Fault, 'Spaces token should return Fault');
		assert.include(spaceRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Sometext token
		const textRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="Some Text" xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.exists(textRes.Fault, 'Text token should return Fault');
		assert.include(textRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});
});
