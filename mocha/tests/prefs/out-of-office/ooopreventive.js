import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('OOOPreventive', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Set OOO preferences', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">I am out of office</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set OOO with future date 2025', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">Future OOO reply</pref>
				<pref name="zimbraPrefOutOfOfficeFromDate">20270101000000Z</pref>
				<pref name="zimbraPrefOutOfOfficeUntilDate">20271231235959Z</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest with future date should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify OOO with external domain', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable OOO with external reply
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">Internal reply</pref>
				<pref name="zimbraPrefOutOfOfficeExternalReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeExternalReply">External reply</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest external should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify OOO with distribution list', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable OOO
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">OOO for DL test</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Set LC zimbraFeatureOutOfOfficeReplyEnabled True', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = createRes.CreateAccountResponse.account[0].id;

		// Set LC attribute via admin
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraFeatureOutOfOfficeReplyEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccountRequest should not fault');
		assert.exists(modRes.ModifyAccountResponse, 'ModifyAccountResponse should exist');
	});


	it('Sanity | Set zimbraPrefOutOfOfficeSuppressExternalReply True', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set suppress external reply
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">Internal only reply</pref>
				<pref name="zimbraPrefOutOfOfficeSuppressExternalReply">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest suppress should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify OOO suppress external reply via GetPrefs', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set and verify suppress external reply
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeSuppressExternalReply">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeSuppressExternalReply"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.exists(getRes.GetPrefsResponse, 'GetPrefsResponse should exist');
	});
});
