import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > Autocomplete > Ranking > Ranking Action Reset', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let contact1Email, contact2Email, contact3Email;
	let account1Token, account2Token, account3Token, account3SharedToken;
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
		const c1Info = Array.isArray(c1.CreateAccountResponse.account) ? c1.CreateAccountResponse.account[0] : c1.CreateAccountResponse.account;
		assert.exists(c1Info.id, 'Account ID should exist');
		const c1Host = c1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(c1Host, 'zimbraMailHost should exist');

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
		const c2Info = Array.isArray(c2.CreateAccountResponse.account) ? c2.CreateAccountResponse.account[0] : c2.CreateAccountResponse.account;
		assert.exists(c2Info.id, 'Account ID should exist');
		const c2Host = c2Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(c2Host, 'zimbraMailHost should exist');

		contact3Email = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create account1 (local contacts test)
		const account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a1.Fault, 'Create account1 should not fault');
		const a1Info = Array.isArray(a1.CreateAccountResponse.account) ? a1.CreateAccountResponse.account[0] : a1.CreateAccountResponse.account;
		assert.exists(a1Info.id, 'Account ID should exist');
		const a1Host = a1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(a1Host, 'zimbraMailHost should exist');
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
		const a2Info = Array.isArray(a2.CreateAccountResponse.account) ? a2.CreateAccountResponse.account[0] : a2.CreateAccountResponse.account;
		assert.exists(a2Info.id, 'Account ID should exist');
		const a2Host = a2Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(a2Host, 'zimbraMailHost should exist');
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
	it('Smoke | Send RankingActionRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'RankingAction reset should not fault');
	});


	it('Sanity | Reset Contact ranking of local contacts', async () => {
		// Create 3 local contacts
		for (const email of [contact1Email, contact2Email, contact3Email]) {
			const cc = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">${firstname}</a>
						<a n="lastName">${lastname}</a>
						<a n="email">${email}</a>
					</cn>
				</CreateContactRequest>`, account1Token
			);
			assert.notExists(cc.Fault, `CreateContact ${email} should not fault`);
		}

		// Send 1 mail to contact1
		const m1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(m1.Fault, 'SendMsg should not fault');

		// Send 2 mails to contact2
		for (let i = 0; i < 2; i++) {
			const m2 = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account1Token
			);
			assert.notExists(m2.Fault, 'SendMsg should not fault');
		}

		// Verify ranking before reset: contact2=2, contact1=1, contact3=0
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

		// Reset all rankings
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account1Token
		);
		assert.notExists(resetRes.Fault, 'RankingAction reset should not fault');

		// Verify all rankings are 0 after reset
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'AutoComplete after reset should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after reset');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '0', 'contact1 ranking should be 0 after reset');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should be 0 after reset');
	});


	it('Sanity | Reset Contact rating of Internal Gal contacts', async () => {
		// Send 1 mail to contact1
		const m1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account2Token
		);
		assert.notExists(m1.Fault, 'SendMsg should not fault');

		// Send 2 mails to contact2
		for (let i = 0; i < 2; i++) {
			const m2 = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account2Token
			);
			assert.notExists(m2.Fault, 'SendMsg should not fault');
		}

		// Verify ranking before reset: contact2=2, contact1=1 (retry for GAL sync)
		let matches = [];
		for (let attempt = 0; attempt < 5; attempt++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<AutoCompleteRequest xmlns="urn:zimbraMail">
					<name>${firstname}</name>
				</AutoCompleteRequest>`, account2Token
			);
			assert.notExists(res.Fault, 'AutoComplete should not fault');
			matches = Array.isArray(res.AutoCompleteResponse.match)
				? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
			const hasC2 = matches.find(m => m.email && m.email.includes(contact2Email));
			const hasC1 = matches.find(m => m.email && m.email.includes(contact1Email));
			if (hasC2 && hasC1) break;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		let c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		let c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		assert.exists(c2Match, 'contact2 should be in GAL results');
		assert.exists(c1Match, 'contact1 should be in GAL results');
		assert.isAbove(Number(c2Match.ranking), Number(c1Match.ranking), 'contact2 ranking should be higher than contact1');

		// Reset all rankings
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account2Token
		);
		assert.notExists(resetRes.Fault, 'RankingAction reset should not fault');

		// Verify all rankings are 0 after reset
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(res2.Fault, 'AutoComplete after reset should not fault');
		matches = Array.isArray(res2.AutoCompleteResponse.match)
			? res2.AutoCompleteResponse.match : (res2.AutoCompleteResponse.match ? [res2.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		assert.exists(c2Match, 'contact2 should still be in GAL results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after reset');
		assert.exists(c1Match, 'contact1 should be in GAL results');
		assert.equal(c1Match.ranking, '0', 'contact1 ranking should be 0 after reset');
	});


	it('Sanity | Reset Contact rating of shared contacts', async () => {
		// Get contacts folder from account3shared
		const gfRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3SharedToken
		);
		assert.notExists(gfRes.Fault, 'GetFolder should not fault');
		const folders = Array.isArray(gfRes.GetFolderResponse.folder) ? gfRes.GetFolderResponse.folder : [gfRes.GetFolderResponse.folder];
		const rootFolder = folders[0];
		const contactsFolder = Array.isArray(rootFolder.folder)
			? rootFolder.folder.find(f => f.name === 'Contacts')
			: (rootFolder.folder && rootFolder.folder.name === 'Contacts' ? rootFolder.folder : null);
		const contactsFolderId = contactsFolder.id;
		assert.exists(contactsFolderId, 'contacts folder id should exist');

		// Create subfolder and share it
		const folderName = `folder${common.getUniqueString()}`;
		const cfRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${contactsFolderId}"/>
			</CreateFolderRequest>`, account3SharedToken
		);
		assert.notExists(cfRes.Fault, 'CreateFolder should not fault');
		const subfolder = Array.isArray(cfRes.CreateFolderResponse.folder) ? cfRes.CreateFolderResponse.folder[0] : cfRes.CreateFolderResponse.folder;
		const subfolderId = subfolder.id;
		assert.exists(subfolderId, 'subfolder id should exist');

		// Grant read access to account3
		const account3Info = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, account3Token
		);
		const faRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${subfolderId}">
					<grant gt="usr" d="${account3Info.GetInfoResponse.name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account3SharedToken
		);
		assert.notExists(faRes.Fault, 'FolderAction should not fault');

		// Create contacts in shared folder
		for (const email of [contact1Email, contact2Email, contact3Email]) {
			const ccRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn l="${subfolderId}">
						<a n="firstName">${firstname}</a>
						<a n="lastName">${lastname}</a>
						<a n="email">${email}</a>
					</cn>
				</CreateContactRequest>`, account3SharedToken
			);
			assert.notExists(ccRes.Fault, 'CreateContact should not fault');
			const cn = Array.isArray(ccRes.CreateContactResponse.cn) ? ccRes.CreateContactResponse.cn[0] : ccRes.CreateContactResponse.cn;
			assert.exists(cn.id, 'contact id should exist');
		}

		// Login as account3 and create mountpoint
		const gf3Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3Token
		);
		assert.notExists(gf3Res.Fault, 'GetFolder should not fault');
		const folders3 = Array.isArray(gf3Res.GetFolderResponse.folder) ? gf3Res.GetFolderResponse.folder : [gf3Res.GetFolderResponse.folder];
		const contactsFolder3 = Array.isArray(folders3[0].folder)
			? folders3[0].folder.find(f => f.name === 'Contacts')
			: (folders3[0].folder && folders3[0].folder.name === 'Contacts' ? folders3[0].folder : null);
		assert.exists(contactsFolder3.id, 'Contacts folder id should exist');

		const cmRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${contactsFolder3.id}" name="mount${common.getUniqueString()}" zid="${account3SharedId}" rid="${subfolderId}" view="contact"/>
			</CreateMountpointRequest>`, account3Token
		);
		assert.notExists(cmRes.Fault, 'CreateMountpoint should not fault');
		const link = Array.isArray(cmRes.CreateMountpointResponse.link) ? cmRes.CreateMountpointResponse.link[0] : cmRes.CreateMountpointResponse.link;
		assert.exists(link.id, 'Mountpoint id should exist');

		// Send 1 mail to contact1, 2 mails to contact2
		const m1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, account3Token
		);
		assert.notExists(m1.Fault, 'SendMsg should not fault');

		for (let i = 0; i < 2; i++) {
			const m2 = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain"><content>content</content></mp>
					</m>
				</SendMsgRequest>`, account3Token
			);
			assert.notExists(m2.Fault, 'SendMsg should not fault');
		}

		// Verify ranking before reset
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

		// Reset all rankings
		const resetRes = await soap.makeSOAPEnvelopeAccount(
			`<RankingActionRequest xmlns="urn:zimbraMail">
				<action op="reset"/>
			</RankingActionRequest>`, account3Token
		);
		assert.notExists(resetRes.Fault, 'RankingAction reset should not fault');

		// Verify all rankings are 0 after reset
		res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account3Token
		);
		assert.notExists(res.Fault, 'AutoComplete after reset should not fault');
		matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		c2Match = matches.find(m => m.email && m.email.includes(contact2Email));
		c1Match = matches.find(m => m.email && m.email.includes(contact1Email));
		c3Match = matches.find(m => m.email && m.email.includes(contact3Email));
		assert.exists(c2Match, 'contact2 should still be in results');
		assert.equal(c2Match.ranking, '0', 'contact2 ranking should be 0 after reset');
		assert.exists(c1Match, 'contact1 should be in results');
		assert.equal(c1Match.ranking, '0', 'contact1 ranking should be 0 after reset');
		assert.exists(c3Match, 'contact3 should be in results');
		assert.equal(c3Match.ranking, '0', 'contact3 ranking should be 0 after reset');
	});
});
