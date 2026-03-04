import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 74468', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Id, account1Token;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccount1 should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account1 ID should exist');
		account1Id = acctInfo.id;
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2
		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccount2 should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account2 ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost for account2 should exist');
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
	it('Sanity | Delete contact group from shared address book with manager rights', async () => {
		// Create a regular contact as account1
		const contactEmail = `email${common.getUniqueString()}@domain.com`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'CreateContact should not fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Create a contact group referencing the contact
		const groupEmail = `email${common.getUniqueString()}@domain.com`;
		const groupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${groupEmail}">
					<a n="filesAs">${groupEmail}</a>
					<a n="nickname">test${common.getUniqueString()}</a>
					<a n="type">group</a>
					<m type="C" value="${cn.id}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(groupRes.Fault, 'CreateContact group should not fault');
		const groupCn = Array.isArray(groupRes.CreateContactResponse.cn)
			? groupRes.CreateContactResponse.cn[0] : groupRes.CreateContactResponse.cn;
		assert.exists(groupCn.id, 'Group id should exist');

		// Get contacts folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const contactsFolder = rootFolder.folder.find(f => f.name === 'Contacts');
		assert.exists(contactsFolder, 'Contacts folder should exist');
		assert.exists(contactsFolder.id, 'Contacts folder id should exist');

		// Share contacts folder with account2 (manager rights)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolder.id}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'FolderAction grant should not fault');
		assert.exists(grantRes.FolderActionResponse.action, 'FolderActionResponse action should exist');

		// As account2: Get root folder and trash folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2Token
		);
		assert.notExists(folder2Res.Fault, 'GetFolder account2 should not fault');
		const root2 = Array.isArray(folder2Res.GetFolderResponse.folder)
			? folder2Res.GetFolderResponse.folder[0] : folder2Res.GetFolderResponse.folder;
		assert.exists(root2.id, 'Account2 root folder id should exist');
		const trashFolder = root2.folder.find(f => f.name === 'Trash');
		assert.exists(trashFolder, 'Trash folder should exist');
		assert.exists(trashFolder.id, 'Trash folder id should exist');

		// Create mountpoint to shared contacts folder
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root2.id}" name="share${common.getUniqueString()}" zid="${account1Id}" rid="${contactsFolder.id}" view="contact"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint link id should exist');

		// Verify shared folder is accessible
		const sharedFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, account2Token
		);
		assert.notExists(sharedFolderRes.Fault, 'GetFolder shared should not fault');
		assert.notExists(sharedFolderRes.Fault, 'GetFolderResponse should exist');

		// Search for the contact group in shared folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${groupEmail} (is:remote OR is:local)</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse cn should exist');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn.id, 'Search result cn id should exist');

		// Move the contact group to trash (delete from shared folder)
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchCn.id}" op="move" l="${trashFolder.id}"/>
			</ContactActionRequest>`, account2Token
		);
		assert.notExists(moveRes.Fault, 'ContactAction move should not fault');
		assert.exists(moveRes.ContactActionResponse.action, 'ContactActionResponse action should exist');

		// Verify it's in trash
		const trashSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:trash</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(trashSearchRes.Fault, 'Trash search should not fault');
		assert.exists(trashSearchRes.SearchResponse.cn, 'Trash should contain the contact');
		const trashCn = Array.isArray(trashSearchRes.SearchResponse.cn)
			? trashSearchRes.SearchResponse.cn[0] : trashSearchRes.SearchResponse.cn;
		assert.exists(trashCn.id, 'Trash contact id should exist');

		// Re-auth as account1 and verify contact group is gone
		account1Token = await soap.getAccountAuthToken(account1Email);
		const verifySearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${groupEmail}</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(verifySearchRes.Fault, 'Verify search should not fault');
	});
});
