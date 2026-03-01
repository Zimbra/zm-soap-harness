import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug78001', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
	const search = { name: `search_${common.getUniqueString()}`, subject: `search_${common.getUniqueString()}`, from: accountEmail, content: `search_${common.getUniqueString()}`, value: `search_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `search_id`, toString() { return this.name; } };
	const test_account = { name: `test_account_${common.getUniqueString()}`, subject: `test_account_${common.getUniqueString()}`, from: accountEmail, content: `test_account_${common.getUniqueString()}`, value: `test_account_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `test_account_id`, toString() { return this.name; } };

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
		test_account.name = accountEmail;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | login as the test account (Bug: 78001)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SendMsgRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a='${test_account.name}'/>
					<su> ${message.subject}</su>
					<mp ct="text/plain">
						<content> ${message.content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		message.id1 = res2.SendMsgResponse?.m[0].id;

		// SendMsgRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message.id1}" rt="w">
					<e t="t" a='${test_account.name}'/>
					<su> ${message.subject}</su>
					<mp ct="text/plain">
						<content>${message.content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		message.id3 = res3.SendMsgResponse?.m[0].id;

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${search.string} in:Sent to:${test_account.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});
});
