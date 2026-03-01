import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug79103', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

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

		// Inject messages with Japanese To/CC headers
		const recipients = [
			{ to: 'CS尾下 <oshita@example.com>', cc: '', subject: 'msg for oshita' },
			{ to: 'CS佐藤 <sato@example.com>', cc: '', subject: 'msg for sato' },
			{ to: 'CS鈴木 <suzuki@example.com>', cc: '', subject: 'msg for suzuki' },
			{ to: '弘次 <koji@example.com>', cc: '', subject: 'msg for koji' },
			{ to: '貴久 <takahisa@example.com>', cc: '', subject: 'msg for takahisa' },
			{ to: '玄幸 <genkou@example.com>', cc: '', subject: 'msg for genkou' }
		];

		for (const r of recipients) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender@example.com
To: ${r.to}
Subject: ${r.subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Content for ${r.subject}</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Searchrequest with non UTF subject (Bug: 79103)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const queries = [
			'TO:"CS尾下" OR CC:"CS尾下"',
			'TO:"CS佐藤" OR CC:"CS佐藤"',
			'TO:"CS鈴木" OR CC:"CS鈴木"',
			'TO:"弘次" OR CC:"弘次"',
			'TO:"貴久" OR CC:"貴久"',
			'TO:"玄幸" OR CC:"玄幸"'
		];

		for (const query of queries) {

			// Search item
			const res = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>${query}</query>
				</SearchRequest>`, accountAuthToken
			);

			// Verify response
			assert.notExists(res.Fault, `Response should not be a Fault for query: ${query}`);
			assert.exists(res.SearchResponse, `SearchResponse should exist for query: ${query}`);
		}
	});
});
