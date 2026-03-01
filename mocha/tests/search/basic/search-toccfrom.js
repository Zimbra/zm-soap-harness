import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > Toccfrom', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const test_account1 = { name: `test_account1_${common.getUniqueString()}`, subject: `test_account1_${common.getUniqueString()}`, from: accountEmail, content: `test_account1_${common.getUniqueString()}`, value: `test_account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `test_account1_id`, toString() { return this.name; } };

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Search for mails with all possible combinations of query operators to, from, cc and bcc', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>to:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>from:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>cc:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>tofrom:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>tocc:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>fromcc:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>tofromcc:${test_account1.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:tome</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:ccme</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:tofromme</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:toccme</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:fromccme</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
			<query>is:tofromccme</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
	});
});
