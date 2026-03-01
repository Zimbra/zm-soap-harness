import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Prefs Modify', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Smoke | set a pref that is defined in the LDAP schema. Should succeed.', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send ModifyPrefsRequest with TRUE
		let modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSaveToSent">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modifyRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');

		// Verify preference value
		let getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSaveToSent"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');
		let responseAttrs = getPrefsRes.GetPrefsResponse._attrs;
		assert.exists(responseAttrs, 'GetPrefsResponse _attrs should exist');
		assert.exists(responseAttrs.zimbraPrefSaveToSent, 'Preference zimbraPrefSaveToSent should exist');
		assert.equal(String(responseAttrs.zimbraPrefSaveToSent).toUpperCase(), 'TRUE', 'Preference value should match');

		// Send ModifyPrefsRequest with FALSE
		modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSaveToSent">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyPrefsRequest should not fault');

		// Verify preference value
		getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefSaveToSent"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');
		responseAttrs = getPrefsRes.GetPrefsResponse._attrs;
		assert.exists(responseAttrs, 'GetPrefsResponse _attrs should exist');
		assert.exists(responseAttrs.zimbraPrefSaveToSent, 'Preference zimbraPrefSaveToSent should exist');
		assert.equal(String(responseAttrs.zimbraPrefSaveToSent).toUpperCase(), 'FALSE', 'Preference value should match');
	});


	it('Regression | Set a pref not defined in the LDAP schema. Should fail.', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Attempt to set pref not in schema
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="notInSchema">abcd 1234</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match expected');
	});


	it('Regression | Set a pref starting with zimbraPref* not defined in the LDAP schema. Should fail.', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Attempt to set pref starting with zimbraPref not in schema
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNotInSchema">abcd 1234</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match expected');
	});


	it('Sanity | Set zimbraPrefIncludeSpamInSearch TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set to TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');

		// Set to FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Regression | Set zimbraPrefIncludeSpamInSearch to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Spaces padded
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">    FALSE   </pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid padding');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');

		// Lowercase boolean
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">true</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should allow blank value');

		// Space value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">         </pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should allow space value');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeSpamInSearch">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');
	});


	it('Sanity | Set zimbraPrefIncludeTrashInSearch to TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefIncludeTrashInSearch to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Camel case False
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">False</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should allow blank value');

		// Space value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">         </pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should allow space value');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefIncludeTrashInSearch">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');
	});


	it('Sanity | Set zimbraPrefGroupMailBy conversation, message', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set conversation
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefGroupMailBy">conversation</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set message
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefGroupMailBy">message</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefGroupMailBy to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefGroupMailBy">Some random text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');
	});


	it('Sanity | Set zimbraPrefMailItemsPerPage valid value (25)', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailItemsPerPage">25</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefMailItemsPerPage 0', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailItemsPerPage">0</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefMailItemsPerPage various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAccountRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAccountRes.Fault, 'CreateAccountRequest should not fault');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Number 18
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailItemsPerPage">18</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Negative number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailItemsPerPage">-1</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		// Server accepts negative limits
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailItemsPerPage">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match expected');
	});


	it('Sanity | Set zimbraPrefMailInitialSearch Valid inputs', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set zimbraPrefMailInitialSearch to in:inbox
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailInitialSearch">in:inbox</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Functional | Set zimbraPrefMailInitialSearch blank', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set zimbraPrefMailInitialSearch to blank
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailInitialSearch"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set zimbraPrefReplyToAddress Email address', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set zimbraPrefReplyToAddress
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyToAddress">test01@persistent.co.in</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Functional | Set zimbraPrefReplyToAddress blank', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set zimbraPrefReplyToAddress to blank
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailInitialSearch"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set zimbraPrefReplyIncludeOriginalText includeNone, includeAsAttachment, includeBody, includeBodyWithPrefix', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set includeNone
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText">includeNone</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set includeAsAttachment
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText">includeAsAttachment</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set includeBody
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText">includeBody</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set includeBodyWithPrefix
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText">includeBodyWithPrefix</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefReplyIncludeOriginalText to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Blank value
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefReplyIncludeOriginalText">Some text that is not in list</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefForwardIncludeOriginalText includeAsAttachment, includeBody, includeBodyWithPrefix', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set includeAsAttachment
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardIncludeOriginalText">includeAsAttachment</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set includeBody
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardIncludeOriginalText">includeBody</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set includeBodyWithPrefix
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardIncludeOriginalText">includeBodyWithPrefix</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefForwardIncludeOriginalText various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Blank value
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardIncludeOriginalText"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardIncludeOriginalText">Some text that is not in list</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefForwardReplyPrefixChar any character or word', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set to < character
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefForwardReplyPrefixChar">&lt;</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set zimbraPrefMailSignatureEnabled = TRUE/FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignatureEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignatureEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefMailSignatureEnabled various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Case sensitive True
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignatureEnabled">True</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignatureEnabled"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignatureEnabled">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Set zimbraPrefMailSignature text content
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailSignature">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Set zimbraPrefNewMailNotificationEnabled = TRUE/FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefNewMailNotificationEnabled to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Case sensitive True
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">True</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefOutOfOfficeReplyEnabled TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefOutOfOfficeReplyEnabled various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Case sensitive True
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">True</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefOutOfOfficeReply Some text', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set zimbraPrefOutOfOfficeReply
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReply">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set zimbraPrefNewMailNotificationEnabled TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefNewMailNotificationEnabled various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Case sensitive True
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">True</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Functional | Set zimbraPrefNewMailNotificationAddress = Some text', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set invalid notification address
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationAddress">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid address');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefMessageViewHtmlPreferred = TRUE/FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMessageViewHtmlPreferred">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMessageViewHtmlPreferred">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefMessageViewHtmlPreferred to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Case sensitive True
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMessageViewHtmlPreferred">True</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMessageViewHtmlPreferred"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMessageViewHtmlPreferred">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefDedupeMessagesSentToSelf = Valid Requests (dedupeNone/moveSentMessageToInbox/secondCopyifOnToOrCC)', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set dedupeNone
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeNone</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set secondCopyifOnToOrCC
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">secondCopyifOnToOrCC</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set dedupeAll
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeAll</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefDedupeMessagesSentToSelf to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Blank value
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Invalid text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">Some other text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefAutoAddAddressEnabled TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefAutoAddAddressEnabled to various values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Lowercase true
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled">true</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid casing');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');

		// Space value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled">         </pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for space');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');
	});


	it('Sanity | Set zimbraPrefContactsPerPage valid value (from list)', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set to 25
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefContactsPerPage">25</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Regression | Set zimbraPrefContactsPerPage valid value (not in list)', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set to 14
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefContactsPerPage">14</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Negative value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefContactsPerPage">-5</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for negative');

		// Some text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefContactsPerPage">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid text');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefContactsPerPage"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');
	});


	it('Sanity | Verify creating a filter rule with valid parameters', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a filter rule
		const filterName = `filterrulename1${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(res.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});


	it('Sanity | Verify creating a rule with duplicate name', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a filter rule
		const filterName = `filterrulename1${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);

		// Create same filter rule again (duplicate name)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyFilterRulesRequest should not fault for duplicate name');
		assert.exists(res.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});


	it('Regression | Verify Saving a valid rule with blank rules, blank op, etc', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Blank rules
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules></filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyFilterRulesRequest should not fault for blank rules');

		// Blank op
		const filterName1 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName1}" active="0">
						<filterTests condition="">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for blank condition');
		assert.include(res.Fault.Detail.Error.Code, 'service.PARSE_ERROR', 'Error Code should match');

		// Invalid op
		const filterName2 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName2}" active="0">
						<filterTests condition="invalid op">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for invalid condition');
		assert.include(res.Fault.Detail.Error.Code, 'service.PARSE_ERROR', 'Error Code should match');

		// Rule without action
		const filterName3 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName3}" active="1">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for empty actions');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');

		// Blank folderPath in action
		const filterName4 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName4}" active="1">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath=""/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for blank folderPath');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');

		// Invalid action name
		const filterName5 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName5}" active="1">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep_invalid/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for invalid action');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');

		// Blank header in headerTest
		const filterName6 = `filter${common.getUniqueString()}`;
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName6}" active="0">
						<filterTests condition="anyof">
							<headerTest header="" stringComparison="is" negative="1" value="test11"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyFilterRulesRequest should fault for blank header');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');
	});


	it('Regression | Set Zimbra Preference that is not in LDAB Schema, leading spaces, etc', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Pref not in zimbra schema
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="NotinzimbraSchema">Some text</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid schema pref');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');

		// Leading spaces in pref name
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="   zimbraPrefAutoAddAddressEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for leading spaces');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error Code should match');

		// Trailing spaces in pref name
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefAutoAddAddressEnabled    ">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for trailing spaces');
	});
});
