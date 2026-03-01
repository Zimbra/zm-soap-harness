import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const COUNTER = { name: `COUNTER_${common.getUniqueString()}`, subject: `COUNTER_${common.getUniqueString()}`, from: accountEmail, content: `COUNTER_${common.getUniqueString()}`, value: `COUNTER_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `COUNTER_id`, toString() { return this.name; } };
	const TIME = { name: `TIME_${common.getUniqueString()}`, subject: `TIME_${common.getUniqueString()}`, from: accountEmail, content: `TIME_${common.getUniqueString()}`, value: `TIME_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `TIME_id`, toString() { return this.name; } };
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const cos01 = { name: `cos01_${common.getUniqueString()}`, subject: `cos01_${common.getUniqueString()}`, from: accountEmail, content: `cos01_${common.getUniqueString()}`, value: `cos01_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `cos01_id`, toString() { return this.name; } };
	const defaultpassword = { name: `defaultpassword_${common.getUniqueString()}`, subject: `defaultpassword_${common.getUniqueString()}`, from: accountEmail, content: `defaultpassword_${common.getUniqueString()}`, value: `defaultpassword_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultpassword_id`, toString() { return this.name; } };

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
	it('Smoke | Smoke test for BrowseRequest', async () => {
		// Admin auth
		adminAuthToken = await soap.getAdminAuthToken();
		// CreateCos
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
                <name xmlns="">cos${TIME}${COUNTER}</name>        
                <a n="zimbraBatchedIndexingSize">0</a> 
            </CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const cos01_id = res2.CreateCosResponse.cos[0].id;

		// Create test account
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${account1.name}</name>
                <password>${defaultpassword.value}</password>
                  <a n="zimbraCOSId">${cos01.id}</a>           
            </CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const test_account1_id = res3.CreateAccountResponse.account[0].id;
		const test_acct1_server = res3.CreateAccountResponse.account.a;

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// BrowseRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="domains" />`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.BrowseResponse.bd, 'Response element should exist');
	});
});
