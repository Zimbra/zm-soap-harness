import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > Bug 57007', function () {
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
	it('Functional | Verify OOO response when account is in maintenance mode', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test.${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = createRes.CreateAccountResponse.account[0].id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Set forwarding and OOO on account1
		const modFwdRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailForwardingAddress">${account3Email}</pref>
				<pref name="zimbraPrefMailLocalDeliveryDisabled">TRUE</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modFwdRes.Fault, 'ModifyPrefsRequest forward should not fault');

		const modOOORes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">reply content</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modOOORes.Fault, 'ModifyPrefsRequest OOO should not fault');

		// Set account1 to maintenance mode
		const maintRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(maintRes.Fault, 'ModifyAccountRequest should not fault');

		// Restore account1 to active (cleanup)
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'Restore account should not fault');
	});
});
