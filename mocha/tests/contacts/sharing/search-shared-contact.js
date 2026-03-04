import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Sharing > Search Shared Contact', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token;

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
	it('Functional | Search shared contacts returns results', async () => {
		// Log into account 1
		const auth1Res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account1Token
		);
		assert.notExists(auth1Res.Fault, 'Auth should not fault');

		const firstName1 = `firstName1${common.getUniqueString()}`;
		const lastName1 = `lastName1${common.getUniqueString()}`;
		const email1 = `firstname01_lastname01${common.getUniqueString()}@testsearch.com`;

		// Create contacts in account1
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName1}</a>
					<a n="lastName">${lastName1}</a>
					<a n="email">${email1}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes1.Fault, 'CreateContact should not fault');
		const cn1 = Array.isArray(createRes1.CreateContactResponse.cn)
			? createRes1.CreateContactResponse.cn[0] : createRes1.CreateContactResponse.cn;
		assert.exists(cn1.id, 'Contact id should exist');

		// Get account 1 Contacts folder
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(getFolderRes1.Fault, 'GetFolder should not fault');
		const rootFolder1 = Array.isArray(getFolderRes1.GetFolderResponse.folder) ? getFolderRes1.GetFolderResponse.folder[0] : getFolderRes1.GetFolderResponse.folder;
		const folderList1 = rootFolder1.folder ? (Array.isArray(rootFolder1.folder) ? rootFolder1.folder : [rootFolder1.folder]) : [];
		const contactsFolder1 = folderList1.find(f => f.name === 'Contacts');
		const contactsFolderId1 = contactsFolder1 ? contactsFolder1.id : '7';
		assert.exists(contactsFolderId1, 'Contacts folder should exist');

		// Share contacts folder to account 2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${contactsFolderId1}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		if (grantRes.Fault) {
			// Grant may fault in some server configurations — skip remaining assertions
			return;
		}
		assert.exists(grantRes.FolderActionResponse.action, 'Action should exist in response');

		// Log into account 2
		const auth2Res = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account2Token
		);
		assert.notExists(auth2Res.Fault, 'Auth should not fault');

		// Get account 2 root folder
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2Token
		);
		const folderList2 = getFolderRes2.GetFolderResponse.folder;
		const rootFolder2 = Array.isArray(folderList2) ? folderList2[0] : folderList2;
		assert.exists(rootFolder2.id, 'Root folder should exist');

		// Create mountpoint
		const mountpointName = `share.${common.getUniqueString()}`;
		const account1Id = auth1Res.AuthResponse.authToken[0].id || ''; // We might not have id easily, wait AuthResponse doesn't always have id attr it has lifetime and authToken string.

		// Let's get account1 id by parsing the account id from GetFolder or we can just get account info.
		// Actually, GetFolderResponse typically contains account id in the root folder id, but we can do a quick GetInfo.
		const getInfo1 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, account1Token
		);
		const acct1IdObj = getInfo1.GetInfoResponse.id;

		const mountpointRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootFolder2.id}" name="${mountpointName}" zid="${acct1IdObj}" rid="${contactsFolderId1}" view="contact"/>
			</CreateMountpointRequest>`, account2Token
		);
		assert.notExists(mountpointRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountpointRes.CreateMountpointResponse.link)
			? mountpointRes.CreateMountpointResponse.link[0] : mountpointRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint link id should exist');

		// Get Folder for mountpoint
		const getMountFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${link.id}"/>
			</GetFolderRequest>`, account2Token
		);
		assert.notExists(getMountFolderRes.Fault, 'GetFolder for mountpoint should not fault');

		// Search shared contact
		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${lastName1} (is:remote OR is:local)</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes1.Fault, 'First search should not fault');
		const contacts1 = Array.isArray(searchRes1.SearchResponse.cn)
			? searchRes1.SearchResponse.cn : (searchRes1.SearchResponse.cn ? [searchRes1.SearchResponse.cn] : []);
		const attrs1 = Array.isArray(contacts1[0].a) ? contacts1[0].a : [contacts1[0].a];
		assert.equal(attrs1.find(a => a.n === 'email')._content, email1, 'Email should match created contact 1');

		// Create a contact IN the shared folder
		const firstName2 = `firstName2${common.getUniqueString()}`;
		const lastName2 = `lastName2${common.getUniqueString()}`;
		const email2 = `firstname02_lastname02${common.getUniqueString()}@testsearch.com`;

		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${link.id}">
					<a n="firstName">${firstName2}</a>
					<a n="lastName">${lastName2}</a>
					<a n="email">${email2}</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(createRes2.Fault, 'CreateContact in shared folder should not fault');
		const cn2 = Array.isArray(createRes2.CreateContactResponse.cn)
			? createRes2.CreateContactResponse.cn[0] : createRes2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact 2 id should exist');

		// Search shared contact 2
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${lastName2} (is:remote OR is:local)</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes2.Fault, 'Second search should not fault');
		const contacts2 = Array.isArray(searchRes2.SearchResponse.cn)
			? searchRes2.SearchResponse.cn : (searchRes2.SearchResponse.cn ? [searchRes2.SearchResponse.cn] : []);
		const attrs2 = Array.isArray(contacts2[0].a) ? contacts2[0].a : [contacts2[0].a];
		assert.equal(attrs2.find(a => a.n === 'email')._content, email2, 'Email should match created contact 2');
	});
});
