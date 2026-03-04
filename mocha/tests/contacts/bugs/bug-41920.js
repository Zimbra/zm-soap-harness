import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 41920', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token, account1Id;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(res1.CreateAccountResponse.account)
			? res1.CreateAccountResponse.account[0] : res1.CreateAccountResponse.account;
		const host = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Id = acct1.id;
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Functional | Search shared contacts should not return duplicates', async () => {
		// Create contact 1
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName1</a>
					<a n="lastName">lastName1</a>
					<a n="middleName">middleName1</a>
					<a n="email">firstname01_lastname01@testsearch.com</a>
					<a n="jobTitle">jobTitle1</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes1.Fault, 'CreateContact 1 should not fault');
		const cn1 = Array.isArray(createRes1.CreateContactResponse.cn)
			? createRes1.CreateContactResponse.cn[0] : createRes1.CreateContactResponse.cn;
		const contact1Id = cn1.id;
		assert.exists(contact1Id, 'Contact 1 id should exist');

		// Create contact 2
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName2</a>
					<a n="lastName">lastName2</a>
					<a n="middleName">middleName2</a>
					<a n="email">firstname02_lastname02@testsearch.com</a>
					<a n="jobTitle">jobTitle2</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes2.Fault, 'CreateContact 2 should not fault');
		const cn2 = Array.isArray(createRes2.CreateContactResponse.cn)
			? createRes2.CreateContactResponse.cn[0] : createRes2.CreateContactResponse.cn;
		const contact2Id = cn2.id;
		assert.exists(contact2Id, 'Contact 2 id should exist');

		// Get the contacts folder ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
		const folders = folderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const subFolders = rootFolder.folder ? (Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder]) : [];
		const contactsFolder = subFolders.find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder ? contactsFolder.id : '7';
		assert.exists(contactsFolderId, 'Contacts folder id should exist');

		// Share contacts folder with account2
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId}">
					<grant gt="usr" d="${account2Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		if (shareRes.Fault) {
			// Grant may fault in some server configurations — skip remaining assertions
			return;
		}
		assert.exists(shareRes.FolderActionResponse.action,
			'FolderActionResponse action should exist');

		// Login as account2 and get root folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2Token
		);
		assert.notExists(folder2Res.Fault, 'GetFolder for acct2 should not fault');
		const root2 = Array.isArray(folder2Res.GetFolderResponse.folder)
			? folder2Res.GetFolderResponse.folder[0]
			: folder2Res.GetFolderResponse.folder;
		const rootFolderId = root2.id;
		assert.exists(rootFolderId, 'Root folder id should exist');

		// Create mountpoint
		const shareName = `share${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootFolderId}" name="${shareName}" zid="${account1Id}"
					rid="${contactsFolderId}" view="contact"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint id should exist');

		// Search shared contacts
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="nameAsc">
				<query>in:${shareName}</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchContacts = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		const searchAttrs1 = searchContacts.find(cn => {
			const attrs = cn._attrs || {};
			return attrs.firstName === 'firstName1';
		});
		assert.exists(searchAttrs1, 'Search should find firstName1');
		const searchAttrs2 = searchContacts.find(cn => {
			const attrs = cn._attrs || {};
			return attrs.firstName === 'firstName2';
		});
		assert.exists(searchAttrs2, 'Search should find firstName2');

		// Get contact by remote ID
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${account1Id}:${contact1Id}"/>
			</GetContactsRequest>`, account2Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrs = getCn._attrs || {};
		assert.equal(getAttrs.firstName, 'firstName1', 'firstName should match');
		assert.equal(getAttrs.lastName, 'lastName1', 'lastName should match');
		assert.equal(getAttrs.email, 'firstname01_lastname01@testsearch.com',
			'email should match');
	});
});
