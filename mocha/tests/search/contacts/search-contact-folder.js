import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Contacts > Contact Folder', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const Spamfirstname = `Spamfirstname_${common.getUniqueString()}`;
	const Trashfirstname = `Trashfirstname_${common.getUniqueString()}`;
	const contacts = { name: 'contacts', id: '7', toString() { return this.name; } };
	const drafts = { name: 'drafts', id: '6', toString() { return this.name; } };
	const folder1 = `folder1_${common.getUniqueString()}`;
	const folder2 = `folder2_${common.getUniqueString()}`;
	const folder3 = `folder3_${common.getUniqueString()}`;
	const folder4 = `folder4_${common.getUniqueString()}`;
	const globals = {
		name: 'globals',
		inbox: 'inbox',
		sent: 'sent',
		trash: 'trash',
		spam: 'junk',
		drafts: 'drafts',
		calendar: 'calendar',
		contacts: 'contacts',
		true: 'TRUE',
		false: 'FALSE',
		toString() { return this.name; }
	};
	const inbox = { name: 'inbox', id: '2', toString() { return this.name; } };
	const sent = { name: 'sent', id: '5', toString() { return this.name; } };
	const spam = { name: 'spam', id: '4', toString() { return this.name; } };
	const spamtag = `spamtag_${common.getUniqueString()}`;
	const trash = { name: 'trash', id: '3', toString() { return this.name; } };
	const trashtag = `trashtag_${common.getUniqueString()}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Functional | Searching contacts in various default folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${inbox} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contacts} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${drafts} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${sent}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${spam} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${trash} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching contacts in custom folders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${folder1} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${folder2} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${folder3} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${folder4} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Setting zimbraPrefIncludeSpamInSearch FALSE and Searching contacts in spam (Bug: 2395)', async () => {
		// Account
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">${globals.false}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${Spamfirstname}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${spamtag}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});


	it('Functional | Setting zimbraPrefIncludeTrashInSearch FALSE and Searching contacts in trash (Bug: 2395)', async () => {
		// Account
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">${globals.false}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${Trashfirstname}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${trashtag}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});
});
