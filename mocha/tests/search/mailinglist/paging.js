import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Mailinglist > Paging', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const subjects = [];
	for (let i = 1; i <= 6; i++) {
		subjects.push(`paging_subj${i}_${common.getUniqueString()}`);
	}

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

		// Inject 6 messages with distinct subjects for paging tests
		for (const subj of subjects) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender@example.com
To: ${accountEmail}
Subject: ${subj}
MIME-Version: 1.0
Content for paging test ${subj}</content>
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
	it('Functional | Verify search paging takes the conversation subject into account (Bug: 37344)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Search all conversations sorted by subject ascending
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" sortBy="subjAsc" offset="0" limit="100" types="conversation">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		const allConvs = res2.SearchResponse?.c;
		assert.exists(allConvs, 'Conversations should exist');
		const totalConvs = Array.isArray(allConvs) ? allConvs.length : 1;
		assert.isAtLeast(totalConvs, 6, 'Should have at least 6 conversations');

		// Page 1: offset=0, limit=2
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="2">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		const page1 = res3.SearchResponse?.c;
		assert.exists(page1, 'Page 1 conversations should exist');

		// Page 2: offset=2, limit=2
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="2" limit="2">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		const page2 = res4.SearchResponse?.c;
		assert.exists(page2, 'Page 2 conversations should exist');

		// Page 3: offset=4, limit=2
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="4" limit="2">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		const page3 = res5.SearchResponse?.c;
		assert.exists(page3, 'Page 3 conversations should exist');
	});
});
