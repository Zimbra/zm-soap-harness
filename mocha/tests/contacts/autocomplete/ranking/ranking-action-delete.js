import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > Autocomplete > Ranking > Ranking Action Delete', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let contact1Email, contact2Email, contact3Email;
	let account1Token, account2Token, account3Token, account3SharedToken, account4Token;
	let account3Id, account3SharedId;
	let firstname, lastname;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		firstname = `first${common.getUniqueString()}`;
		lastname = `last${common.getUniqueString()}`;

		// Create contact accounts with display names
		contact1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${contact1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(c1.Fault, 'Create contact1 should not fault');

		contact2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${contact2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(c2.Fault, 'Create contact2 should not fault');

		contact3Email = `account${common.getUniqueString()}@${config.testDomain}`;
		// contact3 not as account, used as third contact email only

		// Create account1 (local contacts test)
		const account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a1.Fault, 'Create account1 should not fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2 (GAL contacts test)
		const account2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a2.Fault, 'Create account2 should not fault');
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Create account3 (shared contacts test)
		const account3Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a3.Fault, 'Create account3 should not fault');
		const a3Info = Array.isArray(a3.CreateAccountResponse.account) ? a3.CreateAccountResponse.account[0] : a3.CreateAccountResponse.account;
		account3Id = a3Info.id;
		account3Token = await soap.getAccountAuthToken(account3Email);

		// Create account3shared
		const account3SharedEmail = `account${common.getUniqueString()}@${config.testDomain}`;
		const a3s = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3SharedEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a3s.Fault, 'Create account3shared should not fault');
		const a3sInfo = Array.isArray(a3s.CreateAccountResponse.account) ? a3s.CreateAccountResponse.account[0] : a3s.CreateAccountResponse.account;
		account3SharedId = a3sInfo.id;
		account3SharedToken = await soap.getAccountAuthToken(account3SharedEmail);

		// Create account4 (ranking=0 test)
		const account4Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a4.Fault, 'Create account4 should not fault');
		account4Token = await soap.getAccountAuthToken(account4Email);
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
	it('Smoke | Reset Contact ranking of contact2 in local contacts', async () => {
		// Create 3 contacts
		const cc1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(cc1.Fault, 'CreateContact1 should not fault');

		const cc2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(cc2.Fault, 'CreateContact2 should not fault');

		const cc3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact3Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(cc3.Fault, 'CreateContact3 should not fault');

		// Send 1 mail to contact1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Send 2 mails to contact2
		for (let i = 0; i < 2; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account1Token
			);
		}

		// Verify ranking: contact2=2, contact1=1, contact3=0
		let res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		let matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		let c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		let c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		let c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should be in results');
		assert.equal(c2Match.ranking, '2', 'contact2 ranking should be 2');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should be 1');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should be 0');

		// Delete ranking of contact2
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${contact2Email}"/>
			</RankingActionRequest>`, account1Token
		);
		assert.notExists(delRes.Fault, 'RankingAction delete should not fault');

		// Verify ranking after delete: contact2=0, contact1=1, contact3=0
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'AutoComplete after delete should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after delete');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should still be 1');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should still be 0');
	});


	it('Sanity | Reset Contact rating of contact2 of Internal Gal contacts', async () => {
		// Send 1 mail to contact1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account2Token
		);

		// Send 2 mails to contact2
		for (let i = 0; i < 2; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account2Token
			);
		}

		// Verify ranking: contact2=2, contact1=1
		let res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		let matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		let c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		let c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		assert.exists(c2Match, 'contact2 should be in GAL results');
		assert.equal(c2Match.ranking, '2', 'contact2 ranking should be 2');
		assert.exists(c1Match, 'contact1 should be in GAL results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should be 1');

		// Delete ranking of contact2
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${contact2Email}"/>
			</RankingActionRequest>`, account2Token
		);
		assert.notExists(delRes.Fault, 'RankingAction delete should not fault');

		// Verify: contact2=0, contact1=1
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(res.Fault, 'AutoComplete after delete should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after delete');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should still be 1');
	});


	it('Sanity | Reset Contact rating of contact2 in shared contacts', async () => {
		// Get contacts folder from account3shared
		const gfRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3SharedToken
		);
		const folders = Array.isArray(gfRes.GetFolderResponse.folder) ? gfRes.GetFolderResponse.folder : [gfRes.GetFolderResponse.folder];
		const rootFolder = folders[0];
		const contactsFolder = Array.isArray(rootFolder.folder)
			? rootFolder.folder.find(f => f.name === 'Contacts')
			: (rootFolder.folder && rootFolder.folder.name === 'Contacts' ? rootFolder.folder : null);
		const contactsFolderId = contactsFolder.id;

		// Create subfolder and share it
		const folderName = `folder${common.getUniqueString()}`;
		const cfRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account3SharedToken
		);
		const subfolder = Array.isArray(cfRes.CreateFolderResponse.folder) ? cfRes.CreateFolderResponse.folder[0] : cfRes.CreateFolderResponse.folder;
		const subfolderId = subfolder.id;

		// Grant read access to account3
		const account3Email2 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, account3Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${subfolderId}">
					<grant gt="usr" d="${account3Email2.GetInfoResponse.name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account3SharedToken
		);

		// Create contacts in shared folder
		for (const email of [contact1Email, contact2Email, contact3Email]) {
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn l="${subfolderId}">
						<a n="firstName">${firstname}</a>
						<a n="lastName">${lastname}</a>
						<a n="email">${email}</a>
					</cn>
				</CreateContactRequest>`, account3SharedToken
			);
		}

		// Login as account3 and create mountpoint
		const gf3Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3Token
		);
		const folders3 = Array.isArray(gf3Res.GetFolderResponse.folder) ? gf3Res.GetFolderResponse.folder : [gf3Res.GetFolderResponse.folder];
		const contactsFolder3 = Array.isArray(folders3[0].folder)
			? folders3[0].folder.find(f => f.name === 'Contacts')
			: (folders3[0].folder && folders3[0].folder.name === 'Contacts' ? folders3[0].folder : null);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${contactsFolder3.id}" name="mount${common.getUniqueString()}" zid="${account3SharedId}" rid="${subfolderId}" view="contact"/>
			</CreateMountpointRequest>`, account3Token
		);

		// Send 1 mail to contact1, 2 mails to contact2
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account3Token
		);
		for (let i = 0; i < 2; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account3Token
			);
		}

		// Verify ranking before delete
		let res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account3Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		let matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		let c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		let c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		let c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should be in shared results');
		assert.equal(c2Match.ranking, '2', 'contact2 ranking should be 2');
		assert.exists(c1Match, 'contact1 should be in shared results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should be 1');
		assert.exists(c3Match, 'contact3 should be in shared results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should be 0');

		// Delete ranking of contact2
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${contact2Email}"/>
			</RankingActionRequest>`, account3Token
		);
		assert.notExists(delRes.Fault, 'RankingAction delete should not fault');

		// Verify ranking after delete
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account3Token
		);
		assert.notExists(res.Fault, 'AutoComplete after delete should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after delete');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should still be 1');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should still be 0');
	});


	it('Sanity | Send RankingActionRequest with delete option and without email', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete"/>
			</RankingActionRequest>`, account1Token, false
		);
		assert.exists(res.Fault, 'Delete without email should fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST error code');
	});


	it('Sanity | Send RankingActionRequest with delete option and non existing contact', async () => {
		const nxEmail = `nx${common.getUniqueString()}@${config.testDomain}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${nxEmail}"/>
			</RankingActionRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Delete non-existing should not fault');
	});


	it('Sanity | Reset Contact ranking of contact having rating 0', async () => {
		// Create contacts in account4
		const cc1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, account4Token
		);
		assert.notExists(cc1.Fault, 'CreateContact1 should not fault');

		const cc2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, account4Token
		);
		assert.notExists(cc2.Fault, 'CreateContact2 should not fault');

		const cc3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact3Email}</a>
				</cn>
			</CreateContactRequest>`, account4Token
		);
		assert.notExists(cc3.Fault, 'CreateContact3 should not fault');

		// Send 1 mail to contact1, 2 to contact2
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account4Token
		);
		for (let i = 0; i < 2; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account4Token
			);
		}

		// Verify ranking: contact2=2, contact1=1, contact3=0
		let res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account4Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		let matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		let c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		let c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		let c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should be in results');
		assert.equal(c2Match.ranking, '2', 'contact2 ranking should be 2');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should be 1');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should be 0');

		// Delete ranking of contact3 (already 0)
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="delete" email="${contact3Email}"/>
			</RankingActionRequest>`, account4Token
		);
		assert.notExists(delRes.Fault, 'RankingAction delete should not fault');

		// Verify ranking unchanged: contact2=2, contact1=1, contact3=0
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account4Token
		);
		assert.notExists(res.Fault, 'AutoComplete after delete should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '2', 'contact2 ranking should still be 2');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '1', 'contact1 ranking should still be 1');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should still be 0');
	});
});
