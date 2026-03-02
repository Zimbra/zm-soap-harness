import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug 12539', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Chinese subject from XML source
	const chineseSubject1 = '今最も検索されている投資テーマは？';
	const chineseSubject2 = '別の中国語テスト件名';

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

		// Inject message with Chinese/Japanese subject 1
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${chineseSubject1}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content for Chinese subject test</content>
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
	it('Sanity | Verify Chinese subject with double quotes in injected mail 1', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>"${chineseSubject1}"</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});


	it('Sanity | Verify Chinese subject without double quotes in injected mail 1', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${chineseSubject1}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});


	it('Sanity | Verify Chinese subject with double quotes in injected mail 2', async () => {
		// Search for a subject that doesn't exist - expect empty result
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>"${chineseSubject2}"</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Sanity | Verify Chinese subject without double quotes in injected mail 2', async () => {
		// Search for a subject that doesn't exist - expect empty result
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${chineseSubject2}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});
});
