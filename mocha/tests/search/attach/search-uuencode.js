import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Attach > Uuencode', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const account2 = { name: `account2_${common.getUniqueString()}`, subject: `account2_${common.getUniqueString()}`, from: accountEmail, content: `account2_${common.getUniqueString()}`, value: `account2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account2_id`, toString() { return this.name; } };
	const msg01 = { name: `msg01_${common.getUniqueString()}`, subject: `msg01_${common.getUniqueString()}`, from: accountEmail, content: `msg01_${common.getUniqueString()}`, value: `msg01_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `msg01_id`, toString() { return this.name; } };
	const msg02 = { name: `msg02_${common.getUniqueString()}`, subject: `msg02_${common.getUniqueString()}`, from: accountEmail, content: `msg02_${common.getUniqueString()}`, value: `msg02_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `msg02_id`, toString() { return this.name; } };

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

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

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
	it('Regression | Search attachment content of a mime message with uuencoded Word Doc attachment (Bug: 1246)', async () => {
		// Unknown
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns = "urn:zimbraAccount">
                <account by="name">${account1.name}</account>
                <password>${account1.password}</password>
            </AuthRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res.AuthResponse.lifetime), /^\d+$/, 'Value should match pattern');
		const authToken = res1.AuthResponse.authToken;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>in:inbox</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const msg01_id = res2.SearchResponse?.m?.[0].id;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>content:(${msg01.content})</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Regression | Search attachment content of a mime message with uuencoded text attachment (Bug: 1246,700)', async () => {
		// Unknown
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns = "urn:zimbraAccount">
                <account by="name">${account2.name}</account>
                <password>${account2.password}</password>
            </AuthRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.match(String(res.AuthResponse.lifetime), /^\d+$/, 'Value should match pattern');
		authToken = res1.AuthResponse.authToken;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>in:inbox</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const msg02_id = res2.SearchResponse?.m?.[0].id;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			   <query>content:(${msg02.content})</query>
			   </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});
});
