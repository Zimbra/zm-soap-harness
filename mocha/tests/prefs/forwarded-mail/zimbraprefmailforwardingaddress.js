import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Forwarded Mail > Zimbraprefmailforwardingaddress', function () {
	this.timeout(120 * 1000);
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
	it('Smoke | Verify mail forwarding address can be set', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Set forwarding address
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress">${account2Email}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Verify via GetPrefsRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress"/>
			</GetPrefsRequest>`, account1AuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
	});


	it('Sanity | Verify no infinite loop with same destination in CC list', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Set forwarding address
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress">${account2Email}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Verify no infinite loop with same destination in To list', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Set forwarding address
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress">${account2Email}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Verify forwarding with different address formats', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Set forwarding address
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress">${account2Email}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});
});
