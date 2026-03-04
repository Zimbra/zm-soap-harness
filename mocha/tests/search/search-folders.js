import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Search Folders', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const search = { name: 'Satish', query: 'from:satish', newname: 'Unread', newquery: 'is:unread' };

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Smoke | Create a saved search', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateSearchFolder
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${search.name}" query="${search.query}" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		search.id = res2.CreateSearchFolderResponse.search[0].id;
		assert.exists(res2.CreateSearchFolderResponse.search, 'Response element should exist');
	});


	it('Smoke | Modify a saved search', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateSearchFolder
		const searchName2 = `Search_${common.getUniqueString()}`;
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName2}" query="${search.query}" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		search.id = res2.CreateSearchFolderResponse.search[0].id;
		assert.exists(res2.CreateSearchFolderResponse.search, 'Response element should exist');

		// ModifySearchFolder
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifySearchFolderRequest xmlns="urn:zimbraMail">
				<search id="${search.id}" name="${search.newname}" query="${search.newquery}"/>
			</ModifySearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Query using a saved search', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateSearchFolder
		const searchName3 = `Search_${common.getUniqueString()}`;
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName3}" query="${search.query}" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		search.id = res2.CreateSearchFolderResponse.search[0].id;
		assert.exists(res2.CreateSearchFolderResponse.search, 'Response element should exist');

		// GetSearchFolder
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<GetSearchFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Delete a search folder, then hard delete it', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateSearchFolder
		const searchName4 = `Search_${common.getUniqueString()}`;
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName4}" query="${search.query}" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		search.id = res2.CreateSearchFolderResponse.search[0].id;
		assert.exists(res2.CreateSearchFolderResponse.search, 'Response element should exist');

		// FolderActionRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${search.id}" l="3"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// FolderActionRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${search.id}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Create a new folder and immediately hard delete it - From Trash to oblivion', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateSearchFolder
		const searchName5 = `Search_${common.getUniqueString()}`;
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName5}" query="${search.query}" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		search.id = res2.CreateSearchFolderResponse.search[0].id;
		assert.exists(res2.CreateSearchFolderResponse.search, 'Response element should exist');

		// FolderActionRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${search.id}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});
});
