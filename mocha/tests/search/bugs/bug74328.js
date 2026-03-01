import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug74328', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const defaultorigination = { name: `defaultorigination_${common.getUniqueString()}`, subject: `defaultorigination_${common.getUniqueString()}`, from: accountEmail, content: `defaultorigination_${common.getUniqueString()}`, value: `defaultorigination_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultorigination_id`, toString() { return this.name; } };
	const folder1 = { name: `folder1_${common.getUniqueString()}`, subject: `folder1_${common.getUniqueString()}`, from: accountEmail, content: `folder1_${common.getUniqueString()}`, value: `folder1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder1_id`, toString() { return this.name; } };
	const root = { name: 'root', id: '1', toString() { return this.name; } };

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
	it('Sanity | Search in folder with query - under - bugzilla Dave Comfort (Bug: 74328)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Unknown
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// CreateFolderRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name="${folder1.name}" l="${root.id}"/>
            </CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const folder1_id = res3.CreateFolderResponse?.folder?.[0].id;

		// AddMsgRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${folder1.id}">
                    <content>To: ${account1.name}
From: ${defaultorigination.email}
Subject: message
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
Dave Comfort
			                    </content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const message_id = res4.AddMsgResponse.m[0].id;

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>under:bugzilla "Dave Comfort"</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.equal(res5.SearchResponse?.m?.[0].su, 'message', 'su should match');
		message_id = res5.SearchResponse?.m?.[0].id;
		assert.equal(res5.SearchResponse?.m?.[0].su, 'message', 'su should match');
		message_id = res5.SearchResponse?.m?.[0].id;
		assert.exists(res5.SearchResponse?.m, 'Response element should exist');
	});
});
