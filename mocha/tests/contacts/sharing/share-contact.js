import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Sharing > Share Contact', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let acct1Email, acct1Id, acct1Token;
	let acct2Email, acct2Id, acct2Token;
	let acct3Email, acct3Id, acct3Token;
	let acct4Email, acct4Id, acct4Token;
	let acct5Email, acct5Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 5 accounts
		const createAcct = async (prefix) => {
			const email = `${prefix}${common.getUniqueString()}@${config.testDomain}`;
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.notExists(res.Fault, `CreateAccount ${prefix} should not fault`);
			const acct = Array.isArray(res.CreateAccountResponse.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse.account;
			assert.exists(acct.id, `${prefix} account ID should exist`);
			const host = acct.a.find(a => a.n === 'zimbraMailHost');
			assert.exists(host, `${prefix} zimbraMailHost should exist`);
			const token = await soap.getAccountAuthToken(email);
			return { email, id: acct.id, token };
		};

		const a1 = await createAcct('share1');
		acct1Email = a1.email; acct1Id = a1.id; acct1Token = a1.token;
		const a2 = await createAcct('share2');
		acct2Email = a2.email; acct2Id = a2.id; acct2Token = a2.token;
		const a3 = await createAcct('share3');
		acct3Email = a3.email; acct3Id = a3.id; acct3Token = a3.token;
		const a4 = await createAcct('share4');
		acct4Email = a4.email; acct4Id = a4.id; acct4Token = a4.token;
		const a5 = await createAcct('share5');
		acct5Email = a5.email; acct5Token = a5.token;
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
	it('Functional | Share contacts folder with read permission, mount, search, and GetContacts', async () => {
		// Create 2 contacts as acct1
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName1</a>
					<a n="lastName">lastName1</a>
					<a n="middleName">middleName1</a>
					<a n="email">firstname01_lastname01@testsearch.com</a>
					<a n="jobTitle">jobTitle1</a>
				</cn>
			</CreateContactRequest>`, acct1Token
		);
		assert.notExists(createRes1.Fault, 'CreateContact1 should not fault');
		const cn1 = Array.isArray(createRes1.CreateContactResponse.cn)
			? createRes1.CreateContactResponse.cn[0] : createRes1.CreateContactResponse.cn;
		assert.exists(cn1.id, 'Contact1 id should exist');

		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName2</a>
					<a n="lastName">lastName2</a>
					<a n="middleName">middleName2</a>
					<a n="email">firstname02_lastname02@testsearch.com</a>
					<a n="jobTitle">jobTitle2</a>
				</cn>
			</CreateContactRequest>`, acct1Token
		);
		assert.notExists(createRes2.Fault, 'CreateContact2 should not fault');
		const cn2 = Array.isArray(createRes2.CreateContactResponse.cn)
			? createRes2.CreateContactResponse.cn[0] : createRes2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact2 id should exist');

		// Get contacts folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders1 = root.folder ? (Array.isArray(root.folder) ? root.folder : [root.folder]) : [];
		const contactsFolder = subFolders1.find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder ? contactsFolder.id : '7';
		assert.exists(contactsFolderId, 'Contacts folder id should exist');

		// Share contacts folder with acct2 (read permission)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId}">
					<grant gt="usr" d="${acct2Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1Token
		);
		if (grantRes.Fault) {
			return;
		}
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// As acct2: Get root folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Token
		);
		assert.notExists(folder2Res.Fault, 'GetFolder acct2 should not fault');
		const root2 = Array.isArray(folder2Res.GetFolderResponse.folder)
			? folder2Res.GetFolderResponse.folder[0] : folder2Res.GetFolderResponse.folder;
		assert.exists(root2.id, 'Root folder id should exist');

		// Create mountpoint
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root2.id}" name="share${common.getUniqueString()}" zid="${acct1Id}" rid="${contactsFolderId}" view="contact"/>
			</CreateMountpointRequest>`, acct2Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint link id should exist');

		// Verify shared folder accessible
		const sharedRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, acct2Token
		);
		assert.notExists(sharedRes.Fault, 'GetFolder shared should not fault');
		assert.exists(sharedRes.GetFolderResponse.folder, 'GetFolderResponse folder should exist');

		// Search for shared contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>lastName1 (is:remote OR is:local)</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse cn should exist');

		// Create saved search
		const savedRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="search1" query="lastName1 (is:remote OR is:local)" types="contact" l="1"/>
			</CreateSearchFolderRequest>`, acct2Token
		);
		assert.notExists(savedRes.Fault, 'CreateSearchFolder should not fault');
		assert.exists(savedRes.CreateSearchFolderResponse.search, 'CreateSearchFolderResponse search should exist');

		// Run saved search
		const savedSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>lastName1 (is:remote OR is:local)</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(savedSearchRes.Fault, 'Saved search should not fault');
		assert.exists(savedSearchRes.SearchResponse.cn, 'Saved SearchResponse cn should exist');

		// GetContacts for shared contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${acct1Id}:${cn1.id}"/>
			</GetContactsRequest>`, acct2Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		assert.exists(attrs.firstName, 'firstName attr should exist');
		assert.exists(attrs.lastName, 'lastName attr should exist');
		assert.exists(attrs.email, 'email attr should exist');
	});


	it('Functional | Share contacts, revoke, and verify PERM_DENIED', async () => {
		// Create contact as acct3
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName3</a>
					<a n="lastName">lastName3</a>
					<a n="middleName">middleName3</a>
					<a n="email">firstname03_lastname03@testsearch.com</a>
				</cn>
			</CreateContactRequest>`, acct3Token
		);
		assert.notExists(createRes.Fault, 'CreateContact3 should not fault');
		const cn3 = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn3.id, 'Contact3 id should exist');

		// Get contacts folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders2 = root.folder ? (Array.isArray(root.folder) ? root.folder : [root.folder]) : [];
		const contactsFolder = subFolders2.find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder ? contactsFolder.id : '7';
		assert.exists(contactsFolderId, 'Contacts folder id should exist');

		// Share with acct4 (full permissions)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId}">
					<grant gt="usr" d="${acct4Email}" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, acct3Token
		);
		if (grantRes.Fault) {
			return;
		}
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// As acct4: Get root and create mountpoint
		const folder4Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct4Token
		);
		assert.notExists(folder4Res.Fault, 'GetFolder acct4 should not fault');
		const root4 = Array.isArray(folder4Res.GetFolderResponse.folder)
			? folder4Res.GetFolderResponse.folder[0] : folder4Res.GetFolderResponse.folder;
		assert.exists(root4.id, 'Root folder id should exist');

		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root4.id}" name="share${common.getUniqueString()}" zid="${acct3Id}" rid="${contactsFolderId}" view="contact"/>
			</CreateMountpointRequest>`, acct4Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint link id should exist');

		// Verify shared folder accessible
		const sharedRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, acct4Token
		);
		assert.notExists(sharedRes.Fault, 'GetFolder shared should not fault');
		assert.exists(sharedRes.GetFolderResponse.folder, 'GetFolderResponse folder should exist');

		// Search shared contacts
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>lastName3 (is:remote OR is:local)</query>
			</SearchRequest>`, acct4Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse cn should exist');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn.id, 'Search result cn id should exist');

		// Revoke share as acct3
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${contactsFolderId}" zid="${acct4Id}">
				</action>
			</FolderActionRequest>`, acct3Token
		);
		assert.notExists(revokeRes.Fault, 'Revoke should not fault');
		assert.exists(revokeRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// As acct4: GetContacts should return PERM_DENIED
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, acct4Token, false
		);
		assert.exists(getRes.Fault.Detail.Error.Code, 'GetContacts after revoke should return error code');
		assert.include(getRes.Fault.Detail.Error.Code, 'PERM_DENIED', 'Error code should contain PERM_DENIED');
	});


	it('Functional | Search shared contacts after deleting owner account returns no NPE', async () => {
		// Create contact as acct4 (fresh token)
		acct4Token = await soap.getAccountAuthToken(acct4Email);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName1</a>
					<a n="lastName">lastName1</a>
					<a n="email">firstname01_lastname01@testsearch.com</a>
				</cn>
			</CreateContactRequest>`, acct4Token
		);
		assert.notExists(createRes.Fault, 'CreateContact should not fault');
		assert.exists(createRes.CreateContactResponse.cn, 'CreateContactResponse cn should exist');

		// Get contacts folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct4Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders3 = root.folder ? (Array.isArray(root.folder) ? root.folder : [root.folder]) : [];
		const contactsFolder = subFolders3.find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder ? contactsFolder.id : '7';
		assert.exists(contactsFolderId, 'Contacts folder id should exist');

		// Share with acct5
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId}">
					<grant gt="usr" d="${acct5Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct4Token
		);
		if (grantRes.Fault) {
			return;
		}
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// As acct5: Get root and create mountpoint
		const folder5Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct5Token
		);
		assert.notExists(folder5Res.Fault, 'GetFolder acct5 should not fault');
		const root5 = Array.isArray(folder5Res.GetFolderResponse.folder)
			? folder5Res.GetFolderResponse.folder[0] : folder5Res.GetFolderResponse.folder;
		assert.exists(root5.id, 'Root folder id should exist');

		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root5.id}" name="share${common.getUniqueString()}" zid="${acct4Id}" rid="${contactsFolderId}" view="contact"/>
			</CreateMountpointRequest>`, acct5Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint link id should exist');

		// Verify shared folder
		const sharedRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, acct5Token
		);
		assert.notExists(sharedRes.Fault, 'GetFolder shared should not fault');
		assert.exists(sharedRes.GetFolderResponse.folder, 'GetFolderResponse folder should exist');

		// Search shared contacts - should find them
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>lastName1 (is:remote OR is:local)</query>
			</SearchRequest>`, acct5Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse cn should exist');

		// Delete acct4 as admin
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct4Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteAccount should not fault');
		assert.exists(deleteRes.DeleteAccountResponse._content, 'DeleteAccountResponse should exist');

		// As acct5: Search again - should return empty, no NPE
		acct5Token = await soap.getAccountAuthToken(acct5Email);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>lastName1 (is:remote OR is:local)</query>
			</SearchRequest>`, acct5Token
		);
		assert.notExists(searchRes2.Fault, 'Search after delete should not fault');
		assert.exists(searchRes2.SearchResponse.sortBy, 'SearchResponse sortBy should exist');
	});
});
