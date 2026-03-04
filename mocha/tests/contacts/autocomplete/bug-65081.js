import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Bug 65081', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;
	let contact1Email, contact2Email, contact3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account
		const accountEmail = `account${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
		accountToken = await soap.getAccountAuthToken(accountEmail);

		// Get contacts folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
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

		// Create contact1: matt rickson
		contact1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">matt</a>
					<a n="lastName">rickson</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c1.Fault, 'CreateContact1 should not fault');
		const cn1 = Array.isArray(c1.CreateContactResponse.cn)
			? c1.CreateContactResponse.cn[0] : c1.CreateContactResponse.cn;
		assert.exists(cn1.id, 'Contact1 id should exist');

		// Create contact2: matt malcom<unique>
		contact2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">matt</a>
					<a n="lastName">malcom${common.getUniqueString()}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c2.Fault, 'CreateContact2 should not fault');
		const cn2 = Array.isArray(c2.CreateContactResponse.cn)
			? c2.CreateContactResponse.cn[0] : c2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact2 id should exist');

		// Create contact3: mic<unique> rickson
		contact3Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">mic${common.getUniqueString()}</a>
					<a n="lastName">rickson</a>
					<a n="email">${contact3Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c3.Fault, 'CreateContact3 should not fault');
		const cn3 = Array.isArray(c3.CreateContactResponse.cn)
			? c3.CreateContactResponse.cn[0] : c3.CreateContactResponse.cn;
		assert.exists(cn3.id, 'Contact3 id should exist');
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
	it('Sanity | AutoCompleteRequest first last and last first', async () => {
		// Test "matt m" — should match contact2 (matt malcom), not contact1 (matt rickson)
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>matt m</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res1.Fault, 'AutoComplete matt m should not fault');
		let matches = Array.isArray(res1.AutoCompleteResponse.match)
			? res1.AutoCompleteResponse.match : (res1.AutoCompleteResponse.match ? [res1.AutoCompleteResponse.match] : []);
		let matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact2Email)),
			'Should match contact2 email for "matt m"');
		assert.isFalse(matchEmails.some(e => e.includes(contact1Email)),
			'Should NOT match contact1 email for "matt m" (emptyset)');

		// Test "rickson m" — should match contact1 and contact3, not contact2
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>rickson m</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res2.Fault, 'AutoComplete rickson m should not fault');
		matches = Array.isArray(res2.AutoCompleteResponse.match)
			? res2.AutoCompleteResponse.match : (res2.AutoCompleteResponse.match ? [res2.AutoCompleteResponse.match] : []);
		matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact1Email)),
			'Should match contact1 email for "rickson m"');
		assert.isTrue(matchEmails.some(e => e.includes(contact3Email)),
			'Should match contact3 email for "rickson m"');
		assert.isFalse(matchEmails.some(e => e.includes(contact2Email)),
			'Should NOT match contact2 email for "rickson m" (emptyset)');

		// Test "rickson mic" — should match contact3 only
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>rickson mic</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res3.Fault, 'AutoComplete rickson mic should not fault');
		matches = Array.isArray(res3.AutoCompleteResponse.match)
			? res3.AutoCompleteResponse.match : (res3.AutoCompleteResponse.match ? [res3.AutoCompleteResponse.match] : []);
		matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact3Email)),
			'Should match contact3 email for "rickson mic"');
		assert.isFalse(matchEmails.some(e => e.includes(contact2Email)),
			'Should NOT match contact2 email for "rickson mic" (emptyset)');
		assert.isFalse(matchEmails.some(e => e.includes(contact1Email)),
			'Should NOT match contact1 email for "rickson mic" (emptyset)');

		// Test "rickson matt" — should match contact1 only
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>rickson matt</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res4.Fault, 'AutoComplete rickson matt should not fault');
		matches = Array.isArray(res4.AutoCompleteResponse.match)
			? res4.AutoCompleteResponse.match : (res4.AutoCompleteResponse.match ? [res4.AutoCompleteResponse.match] : []);
		matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact1Email)),
			'Should match contact1 email for "rickson matt"');
		assert.isFalse(matchEmails.some(e => e.includes(contact2Email)),
			'Should NOT match contact2 email for "rickson matt" (emptyset)');
		assert.isFalse(matchEmails.some(e => e.includes(contact3Email)),
			'Should NOT match contact3 email for "rickson matt" (emptyset)');
	});
});
