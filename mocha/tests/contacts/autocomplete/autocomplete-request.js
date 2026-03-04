import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Autocomplete Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;
	let contact1First, contact1Last, contact1Email, contact1Id;
	let contact2First, contact2Last, contact2Email, contact2Id;
	let contact3Email, contact3Id;
	let contact4First, contact4Email, contact4Id;
	let contact5Email, contact5Id;
	let contact6Id, contact7Id;
	let folder1Id;

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

		// Create contact1
		contact1First = `first${common.getUniqueString()}`;
		contact1Last = `last${common.getUniqueString()}`;
		contact1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact1First}</a>
					<a n="lastName">${contact1Last}</a>
					<a n="fullName">${contact1First} ${contact1Last}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c1.Fault, 'CreateContact1 should not fault');
		const cn1 = Array.isArray(c1.CreateContactResponse.cn) ? c1.CreateContactResponse.cn[0] : c1.CreateContactResponse.cn;
		contact1Id = cn1.id;
		assert.exists(contact1Id, 'Contact1 id should exist');

		// Create contact2 (same firstname as contact3)
		contact2First = `first${common.getUniqueString()}`;
		contact2Last = `last${common.getUniqueString()}`;
		contact2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact2First}</a>
					<a n="lastName">${contact2Last}</a>
					<a n="fullName">${contact2First} ${contact2Last}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c2.Fault, 'CreateContact2 should not fault');
		const cn2 = Array.isArray(c2.CreateContactResponse.cn) ? c2.CreateContactResponse.cn[0] : c2.CreateContactResponse.cn;
		contact2Id = cn2.id;
		assert.exists(contact2Id, 'Contact2 id should exist');

		// Create contact3 (same firstname as contact2)
		contact3Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c3Last = `last${common.getUniqueString()}`;
		const c3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact2First}</a>
					<a n="lastName">${c3Last}</a>
					<a n="fullName">${contact2First} ${c3Last}</a>
					<a n="email">${contact3Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c3.Fault, 'CreateContact3 should not fault');
		const cn3 = Array.isArray(c3.CreateContactResponse.cn) ? c3.CreateContactResponse.cn[0] : c3.CreateContactResponse.cn;
		contact3Id = cn3.id;
		assert.exists(contact3Id, 'Contact3 id should exist');

		// Create a contact folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1" view="contact"/>
			</CreateFolderRequest>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not fault');
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;
		folder1Id = folder.id;
		assert.exists(folder1Id, 'Folder id should exist');

		// Create contact4 in subfolder
		contact4First = `first${common.getUniqueString()}`;
		const c4Last = `last${common.getUniqueString()}`;
		contact4Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder1Id}">
					<a n="firstName">${contact4First}</a>
					<a n="lastName">${c4Last}</a>
					<a n="fullName">${contact4First} ${c4Last}</a>
					<a n="email">${contact4Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c4.Fault, 'CreateContact4 should not fault');
		const cn4 = Array.isArray(c4.CreateContactResponse.cn) ? c4.CreateContactResponse.cn[0] : c4.CreateContactResponse.cn;
		contact4Id = cn4.id;
		assert.exists(contact4Id, 'Contact4 id should exist');

		// Create contact5 in subfolder (same firstname as contact2/contact3)
		contact5Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c5Last = `last${common.getUniqueString()}`;
		const c5 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder1Id}">
					<a n="firstName">${contact2First}</a>
					<a n="lastName">${c5Last}</a>
					<a n="fullName">${contact2First} ${c5Last}</a>
					<a n="email">${contact5Email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c5.Fault, 'CreateContact5 should not fault');
		const cn5 = Array.isArray(c5.CreateContactResponse.cn) ? c5.CreateContactResponse.cn[0] : c5.CreateContactResponse.cn;
		contact5Id = cn5.id;
		assert.exists(contact5Id, 'Contact5 id should exist');

		// Create contact6 in subfolder (special chars)
		const c6 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder1Id}">
					<a n="firstName">Conf -  hillview</a>
					<a n="lastName">test.server-vmware - dash</a>
					<a n="fullName">Conf -  hillview test.server-vmware - dash</a>
					<a n="email">test.test.talk_twist@special.char.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c6.Fault, 'CreateContact6 should not fault');
		const cn6 = Array.isArray(c6.CreateContactResponse.cn) ? c6.CreateContactResponse.cn[0] : c6.CreateContactResponse.cn;
		contact6Id = cn6.id;
		assert.exists(contact6Id, 'Contact6 id should exist');

		// Create contact7 in subfolder (special chars: star, dollar, hash, ampersand)
		const c7 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folder1Id}">
					<a n="firstName">Mr. Tim*star</a>
					<a n="lastName">dollar$_Hash#and&amp;</a>
					<a n="fullName">Mr. Tim*star dollar$_Hash#and&amp;</a>
					<a n="email">starhash@steel.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(c7.Fault, 'CreateContact7 should not fault');
		const cn7 = Array.isArray(c7.CreateContactResponse.cn) ? c7.CreateContactResponse.cn[0] : c7.CreateContactResponse.cn;
		contact7Id = cn7.id;
		assert.exists(contact7Id, 'Contact7 id should exist');
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
	it('Smoke | Basic AutoCompleteRequest test', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>foo</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
	});


	it('Sanity | Basic AutoCompleteRequest test - verify result', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contact1First}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact1Id, 'Contact1 should be in results');
	});


	it('Sanity | Basic AutoCompleteRequest test - verify result has multiple values', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contact2First}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact2Id, 'Contact2 should be in results');
		assert.include(matchIds, contact3Id, 'Contact3 should be in results');
	});


	it('Sanity | AutoCompleteRequest test with folder', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" folders="${folder1Id}">
				<name>${contact4First}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact4Id, 'Contact4 should be in results');
	});


	it('Sanity | AutoCompleteRequest test with folder - doesnt match contacts in other folder', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" folders="${folder1Id}">
				<name>${contact2First}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact5Id, 'Contact5 (in subfolder) should be in results');
		assert.notInclude(matchIds, contact2Id, 'Contact2 (in root contacts) should NOT be in results');
	});


	it('Sanity | AutoCompleteRequest test for lastname', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contact1Last}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact1Id, 'Contact1 should be in results by lastname');
	});


	it('Sanity | AutoCompleteRequest test for first last', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${contact1First} ${contact1Last}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact1Id, 'Contact1 should be in results by first last');
	});


	it('Sanity | AutoCompleteRequest test for special characters. 1', async () => {
		// Test "Conf " search
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Conf </name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res1.Fault, 'AutoComplete Conf should not fault');
		let matches = Array.isArray(res1.AutoCompleteResponse.match)
			? res1.AutoCompleteResponse.match : (res1.AutoCompleteResponse.match ? [res1.AutoCompleteResponse.match] : []);
		let matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "Conf "');

		// Test "Conf -" search
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Conf -</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res2.Fault, 'AutoComplete Conf- should not fault');
		matches = Array.isArray(res2.AutoCompleteResponse.match)
			? res2.AutoCompleteResponse.match : (res2.AutoCompleteResponse.match ? [res2.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "Conf -"');

		// Test "Conf -  " search
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Conf -  </name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res3.Fault, 'AutoComplete Conf -  should not fault');
		matches = Array.isArray(res3.AutoCompleteResponse.match)
			? res3.AutoCompleteResponse.match : (res3.AutoCompleteResponse.match ? [res3.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "Conf -  "');

		// Test "Conf -  h" search
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Conf -  h</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res4.Fault, 'AutoComplete Conf -  h should not fault');
		matches = Array.isArray(res4.AutoCompleteResponse.match)
			? res4.AutoCompleteResponse.match : (res4.AutoCompleteResponse.match ? [res4.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "Conf -  h"');

		// Test "test." search
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res5.Fault, 'AutoComplete test. should not fault');
		matches = Array.isArray(res5.AutoCompleteResponse.match)
			? res5.AutoCompleteResponse.match : (res5.AutoCompleteResponse.match ? [res5.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test."');

		// Test "test.s" search
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.s</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res6.Fault, 'AutoComplete test.s should not fault');
		matches = Array.isArray(res6.AutoCompleteResponse.match)
			? res6.AutoCompleteResponse.match : (res6.AutoCompleteResponse.match ? [res6.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test.s"');

		// Test "test.server-" search
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.server-</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res7.Fault, 'AutoComplete test.server- should not fault');
		matches = Array.isArray(res7.AutoCompleteResponse.match)
			? res7.AutoCompleteResponse.match : (res7.AutoCompleteResponse.match ? [res7.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test.server-"');

		// Test "test.server-v" search
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.server-v</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res8.Fault, 'AutoComplete test.server-v should not fault');
		matches = Array.isArray(res8.AutoCompleteResponse.match)
			? res8.AutoCompleteResponse.match : (res8.AutoCompleteResponse.match ? [res8.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test.server-v"');

		// Test "test.server-vmware -" search
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.server-vmware -</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res9.Fault, 'AutoComplete test.server-vmware - should not fault');
		matches = Array.isArray(res9.AutoCompleteResponse.match)
			? res9.AutoCompleteResponse.match : (res9.AutoCompleteResponse.match ? [res9.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test.server-vmware -"');

		// Test "test.server-vmware - d" search
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test.server-vmware - d</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res10.Fault, 'AutoComplete test.server-vmware - d should not fault');
		matches = Array.isArray(res10.AutoCompleteResponse.match)
			? res10.AutoCompleteResponse.match : (res10.AutoCompleteResponse.match ? [res10.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact6Id, 'Contact6 should match "test.server-vmware - d"');
	});


	it('Sanity | AutoCompleteRequest test for special characters. 2', async () => {
		// Test "Mr." search
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Mr.</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res1.Fault, 'AutoComplete Mr. should not fault');
		let matches = Array.isArray(res1.AutoCompleteResponse.match)
			? res1.AutoCompleteResponse.match : (res1.AutoCompleteResponse.match ? [res1.AutoCompleteResponse.match] : []);
		let matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "Mr."');

		// Test "Mr. T" search
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Mr. T</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res2.Fault, 'AutoComplete Mr. T should not fault');
		matches = Array.isArray(res2.AutoCompleteResponse.match)
			? res2.AutoCompleteResponse.match : (res2.AutoCompleteResponse.match ? [res2.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "Mr. T"');

		// Test "Mr. Tim" search
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Mr. Tim</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res3.Fault, 'AutoComplete Mr. Tim should not fault');
		matches = Array.isArray(res3.AutoCompleteResponse.match)
			? res3.AutoCompleteResponse.match : (res3.AutoCompleteResponse.match ? [res3.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "Mr. Tim"');

		// Test "Mr. Tim*" search
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Mr. Tim*</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res4.Fault, 'AutoComplete Mr. Tim* should not fault');
		matches = Array.isArray(res4.AutoCompleteResponse.match)
			? res4.AutoCompleteResponse.match : (res4.AutoCompleteResponse.match ? [res4.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "Mr. Tim*"');

		// Test "Mr. Tim*s" search
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Mr. Tim*s</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res5.Fault, 'AutoComplete Mr. Tim*s should not fault');
		matches = Array.isArray(res5.AutoCompleteResponse.match)
			? res5.AutoCompleteResponse.match : (res5.AutoCompleteResponse.match ? [res5.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "Mr. Tim*s"');

		// Test "dollar$" search
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>dollar$</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res6.Fault, 'AutoComplete dollar$ should not fault');
		matches = Array.isArray(res6.AutoCompleteResponse.match)
			? res6.AutoCompleteResponse.match : (res6.AutoCompleteResponse.match ? [res6.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "dollar$"');

		// Test "dollar$_" search
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>dollar$_</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res7.Fault, 'AutoComplete dollar$_ should not fault');
		matches = Array.isArray(res7.AutoCompleteResponse.match)
			? res7.AutoCompleteResponse.match : (res7.AutoCompleteResponse.match ? [res7.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "dollar$_"');

		// Test "dollar$_Hash#" search
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>dollar$_Hash#</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res8.Fault, 'AutoComplete dollar$_Hash# should not fault');
		matches = Array.isArray(res8.AutoCompleteResponse.match)
			? res8.AutoCompleteResponse.match : (res8.AutoCompleteResponse.match ? [res8.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "dollar$_Hash#"');

		// Test "dollar$_Hash#and" search
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>dollar$_Hash#and</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res9.Fault, 'AutoComplete dollar$_Hash#and should not fault');
		matches = Array.isArray(res9.AutoCompleteResponse.match)
			? res9.AutoCompleteResponse.match : (res9.AutoCompleteResponse.match ? [res9.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "dollar$_Hash#and"');

		// Test "dollar$_Hash#and&" search
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>dollar$_Hash#and&amp;</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res10.Fault, 'AutoComplete dollar$_Hash#and& should not fault');
		matches = Array.isArray(res10.AutoCompleteResponse.match)
			? res10.AutoCompleteResponse.match : (res10.AutoCompleteResponse.match ? [res10.AutoCompleteResponse.match] : []);
		matchIds = matches.map(m => m.id);
		assert.include(matchIds, contact7Id, 'Contact7 should match "dollar$_Hash#and&"');
	});


	it('Sanity | AutoCompleteRequest test for name field validation', async () => {
		// Test with empty name
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name></name>
			</AutoCompleteRequest>`, accountToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Empty name should return INVALID_REQUEST');
		assert.include(res1.Fault.Reason.Text, 'name parameter is empty',
			'Fault reason should mention empty name');

		// Test with space-only name
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name> </name>
			</AutoCompleteRequest>`, accountToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Space name should return INVALID_REQUEST');
		assert.include(res2.Fault.Reason.Text, 'name parameter is empty',
			'Fault reason should mention empty name');
	});
});
