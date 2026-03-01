import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Junk > Junk', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const globals = { name: 'globals', inbox: 'inbox', sent: 'sent', trash: 'trash', spam: 'junk', drafts: 'drafts', calendar: 'calendar', contacts: 'contacts', true: 'TRUE', false: 'FALSE', toString() { return this.name; } };
	const junkmail = { name: `junkmail_${common.getUniqueString()}`, subject: `junkmail_${common.getUniqueString()}`, from: accountEmail, content: `junkmail_${common.getUniqueString()}`, value: `junkmail_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `junkmail_id`, toString() { return this.name; } };

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0

Test content</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create setup for the Search Request (Bug: 23573)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Account
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
                <pref name="zimbraPrefIncludeSpamInSearch">${globals.true}</pref>
                <pref name="zimbraPrefIncludeTrashInSearch">${globals.true}</pref>
            </ModifyPrefsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.ModifyPrefsResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:junk from:(${junkmail.from})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set
		// Verify empty result set
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${junkmail.subject2})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// Verify empty result set
		// Verify empty result set
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');
	});
});
