import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug72260', function () {
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

		// Inject messages with various To/From headers for advanced search query testing
		const msgs = [
			{ from: 'Kathy Duran <kduran@example.com>', to: 'kevinh@example.com', subject: 'msg to kevinh from kathy' },
			{ from: 'sender@example.com', to: 'afregoso@example.com', subject: 'msg to afregoso' },
			{ from: 'sender@example.com', to: 'mlo@example.com', subject: 'msg to mlo' },
			{ from: 'sender@example.com', to: 'matt@example.com', subject: 'msg to matt' }
		];

		for (const m of msgs) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: ${m.from}
To: ${m.to}
Subject: ${m.subject}
MIME-Version: 1.0

Content for ${m.subject}</content>
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
	it('Sanity | Verify that advanced search query from - and to - works fine (Bug: 72260)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Search item
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"kevinh"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist for to:kevinh');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"afregoso"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist for to:afregoso');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"kevinh" or to:"afregoso"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist for OR query');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"Kathy Duran" or to:"afregoso"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist for from/to OR');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"mlo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist for to:mlo');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"matt"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist for to:matt');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>to:"mlo" or to:"matt"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist for mlo OR matt');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"Kathy Duran" or to:"mlo"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist for kathy OR mlo');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:"Kathy Duran" or to:"mlo" or to:"matt"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist for triple OR');
	});
});
