import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Group', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
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
	it('Smoke | Create contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${groupName})</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn.id, 'Search result id should exist');
		assert.equal(searchCn.fileAsStr, groupName, 'fileAsStr should match group name');
		const sAttrs = Array.isArray(searchCn.a) ? searchCn.a : [searchCn.a];
		assert.equal(sAttrs.find(a => a.n === 'nickname')._content, groupName, 'nickname should match');
		assert.equal(sAttrs.find(a => a.n === 'type')._content, 'group', 'type should be group');
		assert.exists(sAttrs.find(a => a.n === 'dlist'), 'dlist should exist');
	});


	it('Sanity | Modify contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const newEmail = `test${common.getUniqueString()}@domain.com`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="dlist">${account2Email},${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, account1Token
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');

		// Verify modified group via search
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${groupName})</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.equal(searchCn.fileAsStr, groupName, 'fileAsStr should match');
		const sAttrs = Array.isArray(searchCn.a) ? searchCn.a : [searchCn.a];
		assert.equal(sAttrs.find(a => a.n === 'nickname')._content, groupName, 'nickname should match');
		assert.equal(sAttrs.find(a => a.n === 'type')._content, 'group', 'type should be group');
	});


	it('Sanity | Modify contact to contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">test@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</ModifyContactRequest>`, account1Token
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');

		// Verify modified group via search
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${groupName})</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.equal(searchCn.fileAsStr, groupName, 'fileAsStr should match');
		const sAttrs = Array.isArray(searchCn.a) ? searchCn.a : [searchCn.a];
		assert.equal(sAttrs.find(a => a.n === 'nickname')._content, groupName, 'nickname should match');
		assert.equal(sAttrs.find(a => a.n === 'type')._content, 'group', 'type should be group');
	});


	it('Sanity | Create contact group in sub folder', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const folderName = `folder${common.getUniqueString()}`;

		// Get contacts folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const findFolder = (node, name) => {
			if (node.name === name) return node.id;
			if (node.folder) {
				const arr = Array.isArray(node.folder) ? node.folder : [node.folder];
				for (const f of arr) {
					const found = findFolder(f, name);
					if (found) return found;
				}
			}
			return null;
		};
		const contactsFolderId = findFolder(root, 'Contacts') || '7';

		// Create subfolder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolder should not be a Fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		assert.exists(folder.id, 'Folder id should exist');

		// Create group in subfolder
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder.id}">
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');
	});


	it('Sanity | Delete contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, account1Token
		);
		assert.notExists(delRes.Fault, 'Delete should not be a Fault');
		assert.exists(delRes.ContactActionResponse.action, 'Delete action should exist');

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${groupName})</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.notExists(searchRes.SearchResponse.cn, 'Deleted group should not appear in search');
	});


	it('Sanity | Move contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const folderName = `folder${common.getUniqueString()}`;

		// Get contacts folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const findFolder = (node, name) => {
			if (node.name === name) return node.id;
			if (node.folder) {
				const arr = Array.isArray(node.folder) ? node.folder : [node.folder];
				for (const f of arr) {
					const found = findFolder(f, name);
					if (found) return found;
				}
			}
			return null;
		};
		const contactsFolderId = findFolder(root, 'Contacts') || '7';

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folder.id}"/>
			</ContactActionRequest>`, account1Token
		);
		assert.notExists(moveRes.Fault, 'Move should not be a Fault');
		assert.exists(moveRes.ContactActionResponse.action, 'Move action should exist');
	});


	it('Sanity | Delete contact group from folder', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const folderName = `folder${common.getUniqueString()}`;

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const findFolder = (node, name) => {
			if (node.name === name) return node.id;
			if (node.folder) {
				const arr = Array.isArray(node.folder) ? node.folder : [node.folder];
				for (const f of arr) {
					const found = findFolder(f, name);
					if (found) return found;
				}
			}
			return null;
		};
		const contactsFolderId = findFolder(root, 'Contacts') || '7';

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email},${account3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		// Move to folder
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folder.id}"/>
			</ContactActionRequest>`, account1Token
		);

		// Delete from folder
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, account1Token
		);
		assert.notExists(delRes.Fault, 'Delete should not be a Fault');
		assert.exists(delRes.ContactActionResponse.action, 'Delete action should exist');
	});


	it('Sanity | Create contact group with member having first name and last name', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const member1Email = `email${common.getUniqueString()}@test.com`;
		const member2Email = `email${common.getUniqueString()}@test.com`;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">"First Last"&lt;${member1Email}&gt;,"First2 Last2"&lt;${member2Email}&gt;</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');
	});


	it('Sanity | Create contact group with single member', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');
	});


	it('Functional | Create empty contact group', async () => {
		const groupName = `emptygroup${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Create empty group should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Empty group id should exist');
	});


	it('Functional | Rename contact group', async () => {
		const groupName = `group${common.getUniqueString()}`;
		const newName = `renamed${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="fileAs">8:${groupName}</a>
					<a n="nickname">${groupName}</a>
					<a n="dlist">${account2Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Group id should exist');

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="fileAs">8:${newName}</a>
					<a n="nickname">${newName}</a>
				</cn>
			</ModifyContactRequest>`, account1Token
		);
		assert.notExists(modRes.Fault, 'Rename group should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Renamed group id should exist');
	});
});
