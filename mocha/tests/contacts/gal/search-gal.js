import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > GAL > SearchGAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let account2Email;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">SearchTest User</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);

		account2Email = `galtest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalTest Person</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | SearchGalRequest basic name search', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with email address', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${account2Email}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with domain only', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>@${config.testDomain}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Functional | SearchGalRequest with partial name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>gal</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest case insensitive', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>GALTEST</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest upper case', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>TEST</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Functional | SearchGalRequest with special chars', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test*</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Functional | SearchGalRequest with at sign', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test@</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGalRequest wildcard', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>*</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Functional | SearchGalRequest with limit', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account" limit="1">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with nonexistent user', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>nonexistentuser${common.getUniqueString()}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with empty string', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name></name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with display name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>GalTest Person</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Functional | SearchGalRequest with offset', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account" offset="0">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Regression | SearchGalRequest with single char', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>g</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
