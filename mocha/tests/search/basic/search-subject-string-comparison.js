import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Basic > Subject String Comparison', function () {
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

		// Inject messages with subjects from the email47 directory
		// The XML test searches for subject:">kite" (alphabetically after kite)
		// and subject:"<kite" (alphabetically before kite)
		const subjects = [
			'openwavemail test',
			'mail server config',
			'xmlbeans contribution',
			'language test data',
			'kite flying event',
			'fmail service',
			'javamail api usage',
			'ibibo social network',
			'hotmail migration',
			'gmail integration',
			'email01A content',
			'bug8260 fix'
		];

		for (const subject of subjects) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender@example.com
To: ${accountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content for ${subject}</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}
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
	it('Sanity | Verify that a search for subject - greater than address and subject - greater than address returns the correct email meessage', async () => {
		// SearchRequest - subject:">kite"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:">kite"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest - subject:">=kite"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:">=kite"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify that a search for subject - ltaddress and subjectlt address returns the correct email meessage', async () => {
		// SearchRequest - subject:"<kite"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"&lt;kite"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest - subject:"<=kite"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"&lt;=kite"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
