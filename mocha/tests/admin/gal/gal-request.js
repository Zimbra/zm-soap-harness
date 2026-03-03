import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > GAL Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

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
	it('Smoke | Sanity test for AutocompleteGalRequest', async () => {
		// Create account
		const accountEmail = `gal.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Wait for GAL sync
		await soap.waitFor(5000);

		// Send AutoCompleteGalRequest using admin delegated auth
		const autoRes = await soap.makeSOAPEnvelopeAdmin(
			`<AutoCompleteGalRequest xmlns="urn:zimbraAccount" limit="20" type="account">
				<name>gal</name>
			</AutoCompleteGalRequest>`, adminAuthToken, true, accountId
		);
		assert.notExists(autoRes.Fault, 'AutoCompleteGalRequest should not fault');
	});


	it('Smoke | Sanity test for SearchGalRequest', async () => {
		// Create account
		const accountEmail = `gal.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Search GAL
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount">
				<name>${accountEmail}</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'SearchGalRequest should not fault');
	});


	it('Smoke | Sanity test for AutoCompleteRequest', async () => {
		// Create accounts with display names
		const firstName = `first${common.getUniqueString()}`;
		const lastName = `last${common.getUniqueString()}`;

		const account1Email = `gal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const account2Email = `gal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstName} ${lastName}</a>
				<a n="givenName">${firstName}</a>
				<a n="sn">${lastName}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as first account and send messages to create contact history
		const accountToken = await soap.getAccountAuthToken(account1Email);
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);

		// AutoComplete by first name
		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstName}</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(autoRes.Fault, 'AutoCompleteRequest should not fault');
	});
});
