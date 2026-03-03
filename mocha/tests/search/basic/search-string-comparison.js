import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Basic > Search String Comparison', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

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
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject messages from various senders for from string comparison tests
		const senders = [
			{ from: 'afoo@foo.com', subject: 'email from afoo' },
			{ from: 'bfoo@foo.com', subject: 'email from bfoo' },
			{ from: 'cfoo@foo.com', subject: 'email from cfoo' },
			{ from: 'dfoo@foo.com', subject: 'email from dfoo' },
			{ from: 'efoo@foo.com', subject: 'email from efoo' },
			{ from: 'foo@foo.com', subject: 'email from foo' },
			{ from: 'gfoo@foo.com', subject: 'email from gfoo' },
			{ from: 'hfoo@foo.com', subject: 'email from hfoo' },
			{ from: 'itestfoo@foo.com', subject: 'email from itestfoo' },
			{ from: 'origination_address@origination_domain.com', subject: 'email01E' },
			{ from: 'spamaddress@spam.com', subject: 'email from spam' },
			{ from: 'fromFirst fromLast <fromFirst.fromLast@from_domain.com>', subject: 'bug8260' }
		];

		for (const sender of senders) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: ${sender.from}
To: ${accountEmail}
Subject: ${sender.subject}
MIME-Version: 1.0
Content from ${sender.from}</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}

		// Inject message with Cc header for cc string comparison
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Cc: ecopy_address@copy_domain.com
Subject: email01F
MIME-Version: 1.0
Content with cc header</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Smoke | Verify that a search for from - greater than address and from - greater than address with partial query returns the correct email meessage', async () => {
		// SearchRequest - from:">gfoo"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:">gfoo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest - from:">=gfoo"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:">=gfoo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify that a search for from - greater than address with exact query returns the correct email meessage', async () => {
		// SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:">gfoo@foo.com"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify that a search for from - ltaddress with partial query returns the correct email meessage', async () => {
		// SearchRequest - from:"<gfoo"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"&lt;gfoo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest - from:"<=gfoo"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"&lt;=gfoo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify that a search for from - ltaddress with exact query returns the correct email meessage', async () => {
		// SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"&lt;gfoo@foo.com"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify that a search for CC - greater than address with partial query returns the correct email meessage', async () => {
		// SearchRequest - cc:">ecopy_address"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>cc:">ecopy_address"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// SearchRequest - cc exact
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>cc:"ecopy_address@copy_domain.com"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});
});
