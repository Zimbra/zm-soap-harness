import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Autocomplete GAL and Shared Contacts', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;

	// account1 — in GAL (displayName, givenName, sn set)
	let account1Email, account1Id, account1Host;
	// account2 — GAL=false, Shared=false
	let account2Email, account2Id, account2Host, account2Token;
	// account3 — GAL=true (default), Shared=false (not set)
	let account3Email, account3Id, account3Host, account3Token;
	// account4 — GAL=false, Shared=true
	let account4Email, account4Id, account4Host, account4Token;
	// account5 — GAL=true, Shared=true
	let account5Email, account5Id, account5Host, account5Token;
	// account6 — shares contact folders
	let account6Email, account6Id, account6Host, account6Token;
	// account7 — shares contacts for name-matching tests
	let account7Email, account7Id, account7Host, account7Token;
	// account8 — shared=true, mounts account7 folder
	let account8Email, account8Id, account8Host, account8Token;

	// Common first name prefix for autocomplete searches
	let firstName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		firstName = `first${common.getUniqueString()}`;

		// --- account1: in GAL with displayName/givenName/sn ---
		account1Email = `acct1${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstName} last1${common.getUniqueString()}</a>
				<a n="givenName">${firstName}</a>
				<a n="sn">last1${common.getUniqueString()}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res1.Fault, 'CreateAccount1 should not fault');
		const acct1 = Array.isArray(res1.CreateAccountResponse.account) ? res1.CreateAccountResponse.account[0] : res1.CreateAccountResponse.account;
		account1Id = acct1.id;
		assert.exists(account1Id, 'account1 ID should exist');
		account1Host = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account1Host, 'account1 zimbraMailHost should exist');

		// --- account2: GAL=false, Shared=false ---
		account2Email = `acct2${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">FALSE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'CreateAccount2 should not fault');
		const acct2 = Array.isArray(res2.CreateAccountResponse.account) ? res2.CreateAccountResponse.account[0] : res2.CreateAccountResponse.account;
		account2Id = acct2.id;
		assert.exists(account2Id, 'account2 ID should exist');
		account2Host = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account2Host, 'account2 zimbraMailHost should exist');
		account2Token = await soap.getAccountAuthToken(account2Email);

		// --- account3: GAL=true (default), Shared not set ---
		account3Email = `acct3${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res3.Fault, 'CreateAccount3 should not fault');
		const acct3 = Array.isArray(res3.CreateAccountResponse.account) ? res3.CreateAccountResponse.account[0] : res3.CreateAccountResponse.account;
		account3Id = acct3.id;
		assert.exists(account3Id, 'account3 ID should exist');
		account3Host = acct3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account3Host, 'account3 zimbraMailHost should exist');
		account3Token = await soap.getAccountAuthToken(account3Email);

		// --- account4: GAL=false, Shared=true ---
		account4Email = `acct4${common.getUniqueString()}@${config.testDomain}`;
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefGalAutoCompleteEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res4.Fault, 'CreateAccount4 should not fault');
		const acct4 = Array.isArray(res4.CreateAccountResponse.account) ? res4.CreateAccountResponse.account[0] : res4.CreateAccountResponse.account;
		account4Id = acct4.id;
		assert.exists(account4Id, 'account4 ID should exist');
		account4Host = acct4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account4Host, 'account4 zimbraMailHost should exist');
		account4Token = await soap.getAccountAuthToken(account4Email);

		// --- account5: GAL=true, Shared=true ---
		account5Email = `acct5${common.getUniqueString()}@${config.testDomain}`;
		const res5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res5.Fault, 'CreateAccount5 should not fault');
		const acct5 = Array.isArray(res5.CreateAccountResponse.account) ? res5.CreateAccountResponse.account[0] : res5.CreateAccountResponse.account;
		account5Id = acct5.id;
		assert.exists(account5Id, 'account5 ID should exist');
		account5Host = acct5.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account5Host, 'account5 zimbraMailHost should exist');
		account5Token = await soap.getAccountAuthToken(account5Email);

		// --- account6: shares contact folders (Shared=false) ---
		account6Email = `acct6${common.getUniqueString()}@${config.testDomain}`;
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res6.Fault, 'CreateAccount6 should not fault');
		const acct6 = Array.isArray(res6.CreateAccountResponse.account) ? res6.CreateAccountResponse.account[0] : res6.CreateAccountResponse.account;
		account6Id = acct6.id;
		assert.exists(account6Id, 'account6 ID should exist');
		account6Host = acct6.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account6Host, 'account6 zimbraMailHost should exist');
		account6Token = await soap.getAccountAuthToken(account6Email);

		// --- account7: shares contacts for name-matching tests ---
		account7Email = `acct7${common.getUniqueString()}@${config.testDomain}`;
		const res7 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account7Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res7.Fault, 'CreateAccount7 should not fault');
		const acct7 = Array.isArray(res7.CreateAccountResponse.account) ? res7.CreateAccountResponse.account[0] : res7.CreateAccountResponse.account;
		account7Id = acct7.id;
		assert.exists(account7Id, 'account7 ID should exist');
		account7Host = acct7.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account7Host, 'account7 zimbraMailHost should exist');
		account7Token = await soap.getAccountAuthToken(account7Email);

		// --- account8: Shared=true ---
		account8Email = `acct8${common.getUniqueString()}@${config.testDomain}`;
		const res8 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account8Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res8.Fault, 'CreateAccount8 should not fault');
		const acct8 = Array.isArray(res8.CreateAccountResponse.account) ? res8.CreateAccountResponse.account[0] : res8.CreateAccountResponse.account;
		account8Id = acct8.id;
		assert.exists(account8Id, 'account8 ID should exist');
		account8Host = acct8.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(account8Host, 'account8 zimbraMailHost should exist');
		account8Token = await soap.getAccountAuthToken(account8Email);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	/**
	 * Helper: account6 creates a subfolder under Contacts, shares it with grantee,
	 * creates a contact in that folder. Returns { sharedContactEmail, folderId }.
	 */
	async function setupSharedFolder(granteeEmail) {
		// Get account6 contacts folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account6Token
		);
		assert.notExists(getFolderRes.Fault, 'GetFolder should not fault');
		const folders = getFolderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const contactsFolder = (Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder]).find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder.id;
		assert.exists(contactsFolderId, 'Contacts folder ID should exist');

		// Create subfolder
		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account6Token
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolder should not fault');
		const createdFolder = Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		const folderId = createdFolder.id;
		assert.exists(folderId, 'Created folder ID should exist');

		// Share folder with grantee
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${granteeEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, account6Token
		);
		assert.notExists(shareRes.Fault, 'FolderAction grant should not fault');

		// Create contact in the shared folder
		const sharedContactEmail = `shared${common.getUniqueString()}@${config.testDomain}`;
		const createContactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folderId}">
					<a n="firstName">${firstName}</a>
					<a n="lastName">sharedlast${common.getUniqueString()}</a>
					<a n="email">${sharedContactEmail}</a>
				</cn>
			</CreateContactRequest>`, account6Token
		);
		assert.notExists(createContactRes.Fault, 'CreateContact in shared folder should not fault');
		const sharedCn = Array.isArray(createContactRes.CreateContactResponse.cn) ? createContactRes.CreateContactResponse.cn[0] : createContactRes.CreateContactResponse.cn;
		assert.exists(sharedCn.id, 'Shared contact ID should exist');

		return { sharedContactEmail, folderId };
	}

	/**
	 * Helper: target account creates a personal contact. Returns personalContactEmail.
	 */
	async function createPersonalContact(targetToken) {
		const email = `personal${common.getUniqueString()}@${config.testDomain}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">personallast${common.getUniqueString()}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, targetToken
		);
		assert.notExists(res.Fault, 'CreateContact personal should not fault');
		const cn = Array.isArray(res.CreateContactResponse.cn) ? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Personal contact ID should exist');
		return email;
	}

	/**
	 * Helper: mount a shared folder. Returns mountpoint ID.
	 */
	async function mountSharedFolder(targetToken, folderId) {
		// Get target contacts folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, targetToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolder should not fault');
		const folders = getFolderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const contactsFolder = (Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder]).find(f => f.name === 'Contacts');
		const contactsFolderId = contactsFolder.id;
		assert.exists(contactsFolderId, 'Target contacts folder ID should exist');

		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${contactsFolderId}" name="mount${common.getUniqueString()}" zid="${account6Id}" rid="${folderId}" view="contact"/>
			</CreateMountpointRequest>`, targetToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link) ? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint ID should exist');
		return link.id;
	}

	// -------------------------------------------------------------------
	// Test 01: GAL=false, Shared=false → only personal contacts
	// -------------------------------------------------------------------
	it('Smoke | AutoCompleteRequest with zimbraPrefGalAutoCompleteEnabled false and zimbraPrefSharedAddrBookAutoCompleteEnabled false', async () => {
		const { sharedContactEmail } = await setupSharedFolder(account2Email);
		const personalContactEmail = await createPersonalContact(account2Token);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstName}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = res.AutoCompleteResponse.match
			? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match])
			: [];
		const matchEmails = matches.map(m => m.email || '');

		// Personal contact should match
		assert.isTrue(matchEmails.some(e => e.includes(personalContactEmail)), 'Should include personal contact');
		// Shared contact should NOT match (shared=false)
		assert.isTrue(!matchEmails.some(e => e.includes(sharedContactEmail)), 'Should not include shared contact');
		// GAL (account1) should NOT match (GAL=false)
		assert.isTrue(!matchEmails.some(e => e.includes(account1Email)), 'Should not include GAL contact');
	});

	// -------------------------------------------------------------------
	// Test 02: GAL=true, Shared=false → personal + GAL, not shared
	// -------------------------------------------------------------------
	it('Sanity | AutoCompleteRequest with zimbraPrefGalAutoCompleteEnabled true and zimbraPrefSharedAddrBookAutoCompleteEnabled false', async () => {
		const { sharedContactEmail } = await setupSharedFolder(account3Email);
		const personalContactEmail = await createPersonalContact(account3Token);

		// GAL sync may take time for newly created accounts; poll for GAL match
		let matchEmails;
		let galFound = false;
		for (let i = 0; i < 5; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<AutoCompleteRequest xmlns="urn:zimbraMail">
					<name>${firstName}</name>
				</AutoCompleteRequest>`, account3Token
			);
			assert.notExists(res.Fault, 'AutoComplete should not fault');
			const matches = res.AutoCompleteResponse.match
				? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match])
				: [];
			matchEmails = matches.map(m => m.email || '');
			if (matchEmails.some(e => e.includes(account1Email))) {
				galFound = true;
				break;
			}
			await new Promise(r => setTimeout(r, 2000));
		}

		// Personal contact should match
		assert.isTrue(matchEmails.some(e => e.includes(personalContactEmail)), 'Should include personal contact');
		// Shared contact should NOT match (shared=false)
		assert.isTrue(!matchEmails.some(e => e.includes(sharedContactEmail)), 'Should not include shared contact');
		// GAL (account1) should match (GAL=true)
		assert.isTrue(galFound, 'Should include GAL contact');
	});

	// -------------------------------------------------------------------
	// Test 03: GAL=false, Shared=true → personal + shared, not GAL
	// -------------------------------------------------------------------
	it('Sanity | AutoCompleteRequest with zimbraPrefGalAutoCompleteEnabled false and zimbraPrefSharedAddrBookAutoCompleteEnabled true', async () => {
		const { sharedContactEmail, folderId } = await setupSharedFolder(account4Email);
		await mountSharedFolder(account4Token, folderId);
		const personalContactEmail = await createPersonalContact(account4Token);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstName}</name>
			</AutoCompleteRequest>`, account4Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = res.AutoCompleteResponse.match
			? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match])
			: [];
		const matchEmails = matches.map(m => m.email || '');

		// Personal contact should match
		assert.isTrue(matchEmails.some(e => e.includes(personalContactEmail)), 'Should include personal contact');
		// Shared contact should match (shared=true)
		assert.isTrue(matchEmails.some(e => e.includes(sharedContactEmail)), 'Should include shared contact');
		// GAL (account1) should NOT match (GAL=false)
		assert.isTrue(!matchEmails.some(e => e.includes(account1Email)), 'Should not include GAL contact');
	});

	// -------------------------------------------------------------------
	// Test 04: GAL=true, Shared=true → personal + shared + GAL
	// -------------------------------------------------------------------
	it('Sanity | AutoCompleteRequest with zimbraPrefGalAutoCompleteEnabled true and zimbraPrefSharedAddrBookAutoCompleteEnabled true', async () => {
		const { sharedContactEmail, folderId } = await setupSharedFolder(account5Email);
		await mountSharedFolder(account5Token, folderId);
		const personalContactEmail = await createPersonalContact(account5Token);

		// GAL sync may take time for newly created accounts; poll for GAL match
		let matchEmails;
		let galFound = false;
		for (let i = 0; i < 5; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<AutoCompleteRequest xmlns="urn:zimbraMail">
					<name>${firstName}</name>
				</AutoCompleteRequest>`, account5Token
			);
			assert.notExists(res.Fault, 'AutoComplete should not fault');
			const matches = res.AutoCompleteResponse.match
				? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match])
				: [];
			matchEmails = matches.map(m => m.email || '');
			if (matchEmails.some(e => e.includes(account1Email))) {
				galFound = true;
				break;
			}
			await new Promise(r => setTimeout(r, 2000));
		}

		// Personal contact should match
		assert.isTrue(matchEmails.some(e => e.includes(personalContactEmail)), 'Should include personal contact');
		// Shared contact should match (shared=true)
		assert.isTrue(matchEmails.some(e => e.includes(sharedContactEmail)), 'Should include shared contact');
		// GAL (account1) should match (GAL=true)
		assert.isTrue(galFound, 'Should include GAL contact');
	});

	// -------------------------------------------------------------------
	// Test 05: Shared contact name matching (firstname, lastname, full, email)
	// -------------------------------------------------------------------
	it('Sanity | AutoCompleteRequest with firstname, lastname, firstname lastname, email on shared contact', async () => {
		// account7 creates folder, shares with account8, creates contact
		const getFolderRes7 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account7Token
		);
		assert.notExists(getFolderRes7.Fault, 'GetFolder account7 should not fault');
		const folders7 = getFolderRes7.GetFolderResponse.folder;
		const root7 = Array.isArray(folders7) ? folders7[0] : folders7;
		const contacts7 = (Array.isArray(root7.folder) ? root7.folder : [root7.folder]).find(f => f.name === 'Contacts');
		assert.exists(contacts7.id, 'account7 Contacts folder ID should exist');

		const folderName7 = `folder${common.getUniqueString()}`;
		const createFolderRes7 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName7}" l="${contacts7.id}"/>
			</CreateFolderRequest>`, account7Token
		);
		assert.notExists(createFolderRes7.Fault, 'CreateFolder account7 should not fault');
		const folder7 = Array.isArray(createFolderRes7.CreateFolderResponse.folder) ? createFolderRes7.CreateFolderResponse.folder[0] : createFolderRes7.CreateFolderResponse.folder;
		assert.exists(folder7.id, 'account7 folder ID should exist');

		// Share with account8
		const shareRes7 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder7.id}">
					<grant gt="usr" d="${account8Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account7Token
		);
		assert.notExists(shareRes7.Fault, 'FolderAction grant should not fault');

		// Create contact in shared folder with unique first/last
		const contactFirstName = `cfirst${common.getUniqueString()}`;
		const contactLastName = `clast${common.getUniqueString()}`;
		const contactEmail = `cemail${common.getUniqueString()}@${config.testDomain}`;
		const createContactRes7 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder7.id}">
					<a n="firstName">${contactFirstName}</a>
					<a n="lastName">${contactLastName}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, account7Token
		);
		assert.notExists(createContactRes7.Fault, 'CreateContact account7 should not fault');
		const cn7 = Array.isArray(createContactRes7.CreateContactResponse.cn) ? createContactRes7.CreateContactResponse.cn[0] : createContactRes7.CreateContactResponse.cn;
		assert.exists(cn7.id, 'account7 contact ID should exist');

		// account8: mount shared folder
		const getFolderRes8 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account8Token
		);
		assert.notExists(getFolderRes8.Fault, 'GetFolder account8 should not fault');
		const folders8 = getFolderRes8.GetFolderResponse.folder;
		const root8 = Array.isArray(folders8) ? folders8[0] : folders8;
		const contacts8 = (Array.isArray(root8.folder) ? root8.folder : [root8.folder]).find(f => f.name === 'Contacts');
		assert.exists(contacts8.id, 'account8 Contacts folder ID should exist');

		const mountRes8 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${contacts8.id}" name="mount${common.getUniqueString()}" zid="${account7Id}" rid="${folder7.id}" view="contact"/>
			</CreateMountpointRequest>`, account8Token
		);
		assert.notExists(mountRes8.Fault, 'CreateMountpoint account8 should not fault');
		const link8 = Array.isArray(mountRes8.CreateMountpointResponse.link) ? mountRes8.CreateMountpointResponse.link[0] : mountRes8.CreateMountpointResponse.link;
		assert.exists(link8.id, 'Mountpoint ID should exist');

		// AutoComplete by firstName
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contactFirstName}</name>
			</AutoCompleteRequest>`, account8Token
		);
		assert.notExists(res1.Fault, 'AutoComplete by firstName should not fault');
		const m1 = res1.AutoCompleteResponse.match ? (Array.isArray(res1.AutoCompleteResponse.match) ? res1.AutoCompleteResponse.match : [res1.AutoCompleteResponse.match]) : [];
		assert.isTrue(m1.some(m => (m.email || '').includes(contactEmail)), 'firstName search should match shared contact');

		// AutoComplete by lastName
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contactLastName}</name>
			</AutoCompleteRequest>`, account8Token
		);
		assert.notExists(res2.Fault, 'AutoComplete by lastName should not fault');
		const m2 = res2.AutoCompleteResponse.match ? (Array.isArray(res2.AutoCompleteResponse.match) ? res2.AutoCompleteResponse.match : [res2.AutoCompleteResponse.match]) : [];
		assert.isTrue(m2.some(m => (m.email || '').includes(contactEmail)), 'lastName search should match shared contact');

		// AutoComplete by firstName + lastName
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contactFirstName} ${contactLastName}</name>
			</AutoCompleteRequest>`, account8Token
		);
		assert.notExists(res3.Fault, 'AutoComplete by full name should not fault');
		const m3 = res3.AutoCompleteResponse.match ? (Array.isArray(res3.AutoCompleteResponse.match) ? res3.AutoCompleteResponse.match : [res3.AutoCompleteResponse.match]) : [];
		assert.isTrue(m3.some(m => (m.email || '').includes(contactEmail)), 'Full name search should match shared contact');

		// AutoComplete by email
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contactEmail}</name>
			</AutoCompleteRequest>`, account8Token
		);
		assert.notExists(res4.Fault, 'AutoComplete by email should not fault');
		const m4 = res4.AutoCompleteResponse.match ? (Array.isArray(res4.AutoCompleteResponse.match) ? res4.AutoCompleteResponse.match : [res4.AutoCompleteResponse.match]) : [];
		assert.isTrue(m4.some(m => (m.email || '').includes(contactEmail)), 'Email search should match shared contact');
	});
});
