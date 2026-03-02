import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Mail > Message Get', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Get message and verify contact info in headers', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content for get</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2Token
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Get message with contact in To field', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>get message test</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2Token
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Get message with multiple contacts', async () => {
		const account3Email = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>multi-contact get test</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2Token
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Get message with HTML content', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>html test ${common.getUniqueString()}</su>
					<mp ct="text/html">
						<content>&lt;html&gt;&lt;body&gt;&lt;b&gt;Bold text&lt;/b&gt;&lt;/body&gt;&lt;/html&gt;</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Get message by conversation search', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Get sent message details', async () => {
		const subject = `detail test ${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>detail body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
