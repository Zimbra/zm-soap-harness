import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Sharing > Permissions Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
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

	// SharingContactsBasic_01 — share with read access
	it('Smoke | Share contacts with read access allows viewing but not add/modify/delete/reshare', async () => {
		// Create account1 (owner)
		const acct1Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res1.Fault, 'CreateAccount1 should not fault');
		const acct1 = Array.isArray(res1.CreateAccountResponse.account)
			? res1.CreateAccountResponse.account[0] : res1.CreateAccountResponse.account;
		assert.exists(acct1.id, 'Account1 ID should exist');
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'Account1 zimbraMailHost should exist');
		const acct1Token = await soap.getAccountAuthToken(acct1Email);

		// Create account2 (grantee)
		const acct2Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'CreateAccount2 should not fault');
		const acct2 = Array.isArray(res2.CreateAccountResponse.account)
			? res2.CreateAccountResponse.account[0] : res2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 ID should exist');
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'Account2 zimbraMailHost should exist');
		const acct2Token = await soap.getAccountAuthToken(acct2Email);

		// Create account3 (third party for reshare test)
		const acct3Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res3.Fault, 'CreateAccount3 should not fault');
		const acct3 = Array.isArray(res3.CreateAccountResponse.account)
			? res3.CreateAccountResponse.account[0] : res3.CreateAccountResponse.account;
		assert.exists(acct3.id, 'Account3 ID should exist');
		const host3 = acct3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'Account3 zimbraMailHost should exist');

		// Account1: create contact
		const firstName = `first${common.getUniqueString()}`;
		const lastName = `last${common.getUniqueString()}`;
		const email = `perm${common.getUniqueString()}@domain.com`;
		const createCnRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, acct1Token
		);
		assert.notExists(createCnRes.Fault, 'CreateContact should not fault');
		const cn = Array.isArray(createCnRes.CreateContactResponse.cn)
			? createCnRes.CreateContactResponse.cn[0] : createCnRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Account1: get contacts folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const contactsFolder = rootFolder.folder.find(f => f.name === 'Contacts');
		assert.exists(contactsFolder, 'Contacts folder should exist');
		assert.exists(contactsFolder.id, 'Contacts folder id should exist');

		// Account1: share with read permission
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolder.id}">
					<grant gt="usr" d="${acct2Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1Token
		);
		assert.notExists(grantRes.Fault, 'FolderAction grant should not fault');
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// Account2: get root folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Token
		);
		assert.notExists(folder2Res.Fault, 'GetFolder should not fault');
		const root2 = Array.isArray(folder2Res.GetFolderResponse.folder)
			? folder2Res.GetFolderResponse.folder[0] : folder2Res.GetFolderResponse.folder;
		assert.exists(root2.id, 'Root folder id should exist');

		// Account2: mount shared folder
		const shareName = `share${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root2.id}" name="${shareName}" zid="${acct1.id}" rid="${contactsFolder.id}" view="contact"/>
			</CreateMountpointRequest>`, acct2Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint id should exist');

		// Account2: get shared folder
		const getSharedRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, acct2Token
		);
		assert.notExists(getSharedRes.Fault, 'GetFolder of shared should not fault');

		// Account2: search for contacts
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:"${shareName}"</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn, 'Search should return contact');
		assert.exists(searchCn.id, 'Search contact id should exist');

		// Account2: GetContacts
		const getCnRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, acct2Token
		);
		assert.notExists(getCnRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getCnRes.GetContactsResponse.cn)
			? getCnRes.GetContactsResponse.cn[0] : getCnRes.GetContactsResponse.cn;
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		const fnAttr = getAttrArr.find(a => a.n === 'firstName');
		assert.exists(fnAttr, 'firstName should exist');
		assert.equal(fnAttr._content, firstName, 'firstName should match');
		const lnAttr = getAttrArr.find(a => a.n === 'lastName');
		assert.exists(lnAttr, 'lastName should exist');
		assert.equal(lnAttr._content, lastName, 'lastName should match');
		const emAttr = getAttrArr.find(a => a.n === 'email');
		assert.exists(emAttr, 'email should exist');
		assert.equal(emAttr._content, email, 'email should match');

		// Account2: CreateContact in shared (PERM_DENIED)
		const createDenied = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${link.id}">
					<a n="firstName">firstName</a>
					<a n="lastName">lastName</a>
					<a n="email">email@email.com</a>
				</cn>
			</CreateContactRequest>`, acct2Token, false
		);
		assert.exists(createDenied.Fault, 'CreateContact in read-only share should fault');
		assert.include(createDenied.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'CreateContact should be PERM_DENIED');

		// Account2: ModifyContact (PERM_DENIED)
		const modDenied = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}">
					<a n="firstName">new${firstName}</a>
				</cn>
			</ModifyContactRequest>`, acct2Token, false
		);
		assert.exists(modDenied.Fault, 'ModifyContact in read-only share should fault');
		assert.include(modDenied.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'ModifyContact should be PERM_DENIED');

		// Account2: ContactAction delete (PERM_DENIED)
		const delDenied = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchCn.id}" op="delete"/>
			</ContactActionRequest>`, acct2Token, false
		);
		assert.exists(delDenied.Fault, 'Delete in read-only share should fault');
		assert.include(delDenied.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Delete should be PERM_DENIED');

		// Account2: reshare (PERM_DENIED)
		const reshareDenied = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${link.id}">
					<grant gt="usr" d="${acct3Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct2Token, false
		);
		assert.exists(reshareDenied.Fault, 'Reshare in read-only share should fault');
		assert.include(reshareDenied.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Reshare should be PERM_DENIED');
	});

	// SharingContactsBasic_02 — share with manager (rwidx) access
	it('Sanity | Share contacts with manager access allows view/add/modify/delete but not reshare', async () => {
		const acct4Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res4.Fault, 'CreateAccount4 should not fault');
		const acct4 = Array.isArray(res4.CreateAccountResponse.account)
			? res4.CreateAccountResponse.account[0] : res4.CreateAccountResponse.account;
		assert.exists(acct4.id, 'Account4 ID should exist');
		const host4 = acct4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'Account4 zimbraMailHost should exist');
		const acct4Token = await soap.getAccountAuthToken(acct4Email);

		const acct5Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct5Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res5.Fault, 'CreateAccount5 should not fault');
		const acct5 = Array.isArray(res5.CreateAccountResponse.account)
			? res5.CreateAccountResponse.account[0] : res5.CreateAccountResponse.account;
		assert.exists(acct5.id, 'Account5 ID should exist');
		const host5 = acct5.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host5, 'Account5 zimbraMailHost should exist');
		const acct5Token = await soap.getAccountAuthToken(acct5Email);

		const acct3Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Account4: create contact
		const firstName = `first${common.getUniqueString()}`;
		const lastName = `last${common.getUniqueString()}`;
		const email = `perm${common.getUniqueString()}@domain.com`;
		const createCnRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, acct4Token
		);
		assert.notExists(createCnRes.Fault, 'CreateContact should not fault');
		const cn = Array.isArray(createCnRes.CreateContactResponse.cn)
			? createCnRes.CreateContactResponse.cn[0] : createCnRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Get contacts folder and share with rwidx
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct4Token
		);
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const contactsFolder = rootFolder.folder.find(f => f.name === 'Contacts');
		assert.exists(contactsFolder.id, 'Contacts folder id should exist');

		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolder.id}">
					<grant gt="usr" d="${acct5Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct4Token
		);
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// Account5: mount shared folder
		const folder5Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct5Token
		);
		const root5 = Array.isArray(folder5Res.GetFolderResponse.folder)
			? folder5Res.GetFolderResponse.folder[0] : folder5Res.GetFolderResponse.folder;
		assert.exists(root5.id, 'Root folder id should exist');

		const shareName = `share${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root5.id}" name="${shareName}" zid="${acct4.id}" rid="${contactsFolder.id}" view="contact"/>
			</CreateMountpointRequest>`, acct5Token
		);
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint id should exist');

		// Get shared folder
		const getSharedRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, acct5Token
		);

		// Search
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:"${shareName}"</query>
			</SearchRequest>`, acct5Token
		);
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn.id, 'Search contact id should exist');

		// GetContacts
		const getCnRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, acct5Token
		);
		const getCn = Array.isArray(getCnRes.GetContactsResponse.cn)
			? getCnRes.GetContactsResponse.cn[0] : getCnRes.GetContactsResponse.cn;
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		assert.equal(getAttrArr.find(a => a.n === 'firstName')._content, firstName, 'firstName should match');
		assert.equal(getAttrArr.find(a => a.n === 'lastName')._content, lastName, 'lastName should match');
		assert.equal(getAttrArr.find(a => a.n === 'email')._content, email, 'email should match');

		// CreateContact in shared (SUCCESS)
		const createOk = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${link.id}">
					<a n="firstName">firstName</a>
					<a n="lastName">lastName</a>
					<a n="email">email@email.com</a>
				</cn>
			</CreateContactRequest>`, acct5Token
		);
		assert.notExists(createOk.Fault, 'CreateContact in manager share should succeed');
		assert.exists(createOk.CreateContactResponse.cn, 'CreateContactResponse cn should exist');

		// ModifyContact (SUCCESS)
		const modOk = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}">
					<a n="firstName">new${firstName}</a>
				</cn>
			</ModifyContactRequest>`, acct5Token
		);
		assert.notExists(modOk.Fault, 'ModifyContact in manager share should succeed');
		assert.exists(modOk.ModifyContactResponse.cn, 'ModifyContactResponse cn should exist');

		// ContactAction delete (SUCCESS)
		const delOk = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchCn.id}" op="delete"/>
			</ContactActionRequest>`, acct5Token
		);
		assert.notExists(delOk.Fault, 'Delete in manager share should succeed');
		assert.exists(delOk.ContactActionResponse.action, 'ContactActionResponse action should exist');

		// Reshare (PERM_DENIED)
		const reshareDenied = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${link.id}">
					<grant gt="usr" d="${acct3Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct5Token, false
		);
		assert.exists(reshareDenied.Fault, 'Reshare from manager share should fault');
		assert.include(reshareDenied.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Reshare should be PERM_DENIED');
	});

	// SharingContactsBasic_03 — share with none access
	it('Sanity | Share contacts with none access denies all operations', async () => {
		const acct6Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct6Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res6.Fault, 'CreateAccount6 should not fault');
		const acct6 = Array.isArray(res6.CreateAccountResponse.account)
			? res6.CreateAccountResponse.account[0] : res6.CreateAccountResponse.account;
		assert.exists(acct6.id, 'Account6 ID should exist');
		const host6 = acct6.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host6, 'Account6 zimbraMailHost should exist');
		const acct6Token = await soap.getAccountAuthToken(acct6Email);

		const acct7Email = `sharing${common.getUniqueString()}@${config.testDomain}`;
		const res7 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct7Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res7.Fault, 'CreateAccount7 should not fault');
		const acct7 = Array.isArray(res7.CreateAccountResponse.account)
			? res7.CreateAccountResponse.account[0] : res7.CreateAccountResponse.account;
		assert.exists(acct7.id, 'Account7 ID should exist');
		const host7 = acct7.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host7, 'Account7 zimbraMailHost should exist');
		const acct7Token = await soap.getAccountAuthToken(acct7Email);

		// Account6: create contact
		const firstName = `first${common.getUniqueString()}`;
		const lastName = `last${common.getUniqueString()}`;
		const email = `perm${common.getUniqueString()}@domain.com`;
		const createCnRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, acct6Token
		);
		assert.notExists(createCnRes.Fault, 'CreateContact should not fault');
		const cn = Array.isArray(createCnRes.CreateContactResponse.cn)
			? createCnRes.CreateContactResponse.cn[0] : createCnRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Get contacts folder and share with none
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct6Token
		);
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const contactsFolder = rootFolder.folder.find(f => f.name === 'Contacts');
		assert.exists(contactsFolder.id, 'Contacts folder id should exist');

		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolder.id}">
					<grant gt="usr" d="${acct7Email}" perm=""/>
				</action>
			</FolderActionRequest>`, acct6Token
		);
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// Account7: get root
		const folder7Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct7Token
		);
		const root7 = Array.isArray(folder7Res.GetFolderResponse.folder)
			? folder7Res.GetFolderResponse.folder[0] : folder7Res.GetFolderResponse.folder;
		assert.exists(root7.id, 'Root folder id should exist');

		// Account7: mount (PERM_DENIED)
		const shareName = `share${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root7.id}" name="${shareName}" zid="${acct6.id}" rid="${contactsFolder.id}" view="contact"/>
			</CreateMountpointRequest>`, acct7Token, false
		);
		assert.exists(mountRes.Fault, 'Mount with none perm should fault');
		assert.include(mountRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Mount should be PERM_DENIED');

		// Account7: GetFolder of remote (PERM_DENIED)
		const getRemoteRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${acct6.id}:${contactsFolder.id}"/>
			</GetFolderRequest>`, acct7Token, false
		);
		assert.exists(getRemoteRes.Fault, 'GetFolder remote with none perm should fault');
		assert.include(getRemoteRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'GetFolder should be PERM_DENIED');

		// Account7: Search in remote (empty)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>inid:"${acct6.id}:${contactsFolder.id}"</query>
			</SearchRequest>`, acct7Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.notExists(searchRes.SearchResponse.cn, 'Search in none-perm share should return no contacts');

		// Account7: GetContacts remote (PERM_DENIED)
		const getCnRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${acct6.id}:${cn.id}"/>
			</GetContactsRequest>`, acct7Token, false
		);
		assert.exists(getCnRes.Fault, 'GetContacts remote with none perm should fault');
		assert.include(getCnRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'GetContacts should be PERM_DENIED');

		// Account7: ModifyContact remote (PERM_DENIED)
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${acct6.id}:${cn.id}">
					<a n="firstName">new${firstName}</a>
				</cn>
			</ModifyContactRequest>`, acct7Token, false
		);
		assert.exists(modRes.Fault, 'ModifyContact remote with none perm should fault');
		assert.include(modRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'ModifyContact should be PERM_DENIED');

		// Account7: ContactAction delete remote (PERM_DENIED)
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${acct6.id}:${cn.id}" op="delete"/>
			</ContactActionRequest>`, acct7Token, false
		);
		assert.exists(delRes.Fault, 'Delete remote with none perm should fault');
		assert.include(delRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Delete should be PERM_DENIED');

		// Account7: CreateContact in remote (PERM_DENIED)
		const createRem = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${acct6.id}:${contactsFolder.id}">
					<a n="firstName">firstName</a>
					<a n="lastName">lastName</a>
					<a n="email">email@email.com</a>
				</cn>
			</CreateContactRequest>`, acct7Token, false
		);
		assert.exists(createRem.Fault, 'CreateContact remote with none perm should fault');
		assert.include(createRem.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'CreateContact should be PERM_DENIED');

		// Account7: reshare remote (PERM_DENIED)
		const reshareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${acct6.id}:${contactsFolder.id}">
					<grant gt="usr" d="${acct6Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct7Token, false
		);
		assert.exists(reshareRes.Fault, 'Reshare remote with none perm should fault');
		assert.include(reshareRes.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Reshare should be PERM_DENIED');
	});
});
