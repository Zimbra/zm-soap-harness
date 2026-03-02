import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Hideaccounts GAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let hiddenEmail, hiddenId;

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
		accountToken = await soap.getAccountAuthToken(accountEmail);

		hiddenEmail = `hidden${common.getUniqueString()}@${config.testDomain}`;
		const hiddenRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${hiddenEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(hiddenRes.CreateAccountResponse.account)
			? hiddenRes.CreateAccountResponse.account[0] : hiddenRes.CreateAccountResponse.account;
		hiddenId = acct.id;
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
	it('Sanity | Hidden account not in SearchGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Visible account found via SearchGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Hidden account not in AutoComplete', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>hidden</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | Hide account and verify SearchGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${hiddenEmail}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Unhide account and verify SearchGal', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${hiddenId}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send search gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Re-hide account and verify', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${hiddenId}</id>
				<a n="zimbraHideInGal">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send search gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Hide via ModifyAccount', async () => {
		const newEmail = `visible${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const newRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const newAcct = Array.isArray(newRes.CreateAccountResponse.account)
			? newRes.CreateAccountResponse.account[0] : newRes.CreateAccountResponse.account;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${newAcct.id}</id>
				<a n="zimbraHideInGal">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send search gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>visible</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Hidden account not in SyncGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});


	it('Regression | Search hidden in SyncGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});


	it('Regression | Hidden DL not shown in GAL', async () => {
		const dlName = `hiddendl${common.getUniqueString()}@${config.testDomain}`;

		// Create a distribution list
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');

		// Send search gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hiddendl</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Hidden DL not in AutoComplete', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>hiddendl</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | Hide DL and verify SyncGal', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});


	it('Sanity | Hidden account still accessible by admin', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${hiddenEmail}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetAccount should not be a Fault');
	});


	it('Regression | Verify multiple hidden accounts', async () => {
		const hidden2 = `hidden2${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${hidden2}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send search gal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden2</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Hidden account not in wildcard search', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>*</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Toggle hide and search', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${hiddenId}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send search gal request
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'SearchGal should not be a Fault');

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${hiddenId}</id>
				<a n="zimbraHideInGal">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
	});


	it('Regression | Hidden CalendarResource not in GAL', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | Hidden account via domain search', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>hidden</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
