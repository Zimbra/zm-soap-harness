import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Bug 72034', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Token, account1Id;
	let account2Token, account2Email;
	let contactGroupNickname;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcct1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct1.Fault, 'CreateAccount1 should not fault');
		const acct1 = Array.isArray(createAcct1.CreateAccountResponse.account)
			? createAcct1.CreateAccountResponse.account[0] : createAcct1.CreateAccountResponse.account;
		account1Id = acct1.id;
		assert.exists(account1Id, 'Account1 ID should exist');
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2 with shared addr book autocomplete enabled
		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcct2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct2.Fault, 'CreateAccount2 should not fault');
		const acct2 = Array.isArray(createAcct2.CreateAccountResponse.account)
			? createAcct2.CreateAccountResponse.account[0] : createAcct2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 ID should exist');
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
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
	it('Sanity | Unable to delete Contact groups from shared address-books with manager rights', async () => {
		// Get contacts folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const rootFolder = folders[0];
		const contactsFolder = Array.isArray(rootFolder.folder)
			? rootFolder.folder.find(f => f.name === 'Contacts')
			: (rootFolder.folder && rootFolder.folder.name === 'Contacts' ? rootFolder.folder : null);
		const contactsFolderId = contactsFolder.id;
		assert.exists(contactsFolderId, 'Contacts folder id should exist');

		// Create subfolder under Contacts
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolder should not fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		const folder1Id = folder.id;
		assert.exists(folder1Id, 'Folder id should exist');

		// Create a contact in the subfolder
		const contactEmail = `email${common.getUniqueString()}@domain.com`;
		const createContactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder1Id}">
					<a n="firstName">First.${common.getUniqueString()}</a>
					<a n="lastName">Last.${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createContactRes.Fault, 'CreateContact should not fault');
		const cn = Array.isArray(createContactRes.CreateContactResponse.cn)
			? createContactRes.CreateContactResponse.cn[0] : createContactRes.CreateContactResponse.cn;
		const contact1Id = cn.id;
		assert.exists(contact1Id, 'Contact id should exist');

		// Create a contact group in the subfolder
		contactGroupNickname = `email1.${common.getUniqueString()}@domain.com`;
		const createGroupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${contactGroupNickname}" l="${folder1Id}">
					<a n="filesAs">${contactGroupNickname}</a>
					<a n="nickname">${contactGroupNickname}</a>
					<a n="type">group</a>
					<m type="C" value="${contact1Id}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createGroupRes.Fault, 'CreateContactGroup should not fault');
		const groupCn = Array.isArray(createGroupRes.CreateContactResponse.cn)
			? createGroupRes.CreateContactResponse.cn[0] : createGroupRes.CreateContactResponse.cn;
		assert.exists(groupCn.id, 'Contact group id should exist');

		// Share the folder with account2 with manager rights
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder1Id}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest grant should not fault');
		assert.exists(grantRes.FolderActionResponse.action, 'Grant action should exist');

		// Login as account2 and get root folder id
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2Token
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest should not fault');
		const folders2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder : [getFolderRes2.GetFolderResponse.folder];
		const rootId = folders2[0].id;
		assert.exists(rootId, 'Root folder id should exist');

		// Create mountpoint
		const shareName = `share${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${shareName}" zid="${account1Id}" rid="${folder1Id}" view="contact"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint id should exist');

		// Search for the contact group in shared folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contactGroupNickname} (is:remote OR is:local)</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		const contactGroupId = searchCn.id;
		assert.exists(contactGroupId, 'Search should find contact group id');

		// AutoComplete for the group nickname
		const acRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>email1</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(acRes.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(acRes.AutoCompleteResponse.match)
			? acRes.AutoCompleteResponse.match : (acRes.AutoCompleteResponse.match ? [acRes.AutoCompleteResponse.match] : []);
		const groupMatch = matches.find(m => m.id === contactGroupId);
		assert.exists(groupMatch, 'Should find contact group in autocomplete results');
		assert.equal(groupMatch.display, contactGroupNickname, 'Display should match group nickname');
		assert.equal(groupMatch.type, 'contact', 'Type should be contact');
		assert.equal(groupMatch.isGroup, '1', 'isGroup should be 1');
	});
});
