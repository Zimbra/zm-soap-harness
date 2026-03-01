import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > GAL > AutoComplete GAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let account2Email, account3Email;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);

		account2Email = `galuser${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalUser Two</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `galthree${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalThree User</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | AutoComplete in GAL search basic', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL returns account entries', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL with full display name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GalUser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with partial name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL with email domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${config.testDomain}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL case insensitive', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GALUSER</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with special characters', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal*</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with single char', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>g</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with two chars', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>ga</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with at sign', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser@</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with dots', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal.user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with hyphen', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal-user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with underscore', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal_user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL nonexistent user', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>nonexistentxyz${common.getUniqueString()}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with limit', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" limit="1">
				<name>gal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL with needExp', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" needExp="1">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL verify response attributes', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with leading space', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name> galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with trailing space', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser </name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with number prefix', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>123</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with mixed case', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GaLuSeR</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with full email', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${account2Email}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Regression | AutoComplete GAL with comma', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Two, GalUser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Functional | AutoComplete GAL with includeGal false', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" includeGal="0">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL after account creation', async () => {
		const newEmail = `newgal${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send auto complete request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>newgal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});
});
