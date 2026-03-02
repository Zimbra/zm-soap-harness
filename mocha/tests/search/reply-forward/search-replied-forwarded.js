import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Reply Forward > Search Replied Forwarded', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	const mailSubject = `mail_${common.getUniqueString()}`;

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
	it('Functional | Create setup for the Search (Bug: 2459)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject 8 messages with mailSubject
		for (let i = 0; i < 8; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: sender${i}@example.com
To: ${accountEmail}
Subject: ${mailSubject}
MIME-Version: 1.0
Test content for message ${i}</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}

		// Search for messages
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${mailSubject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Messages should exist');
		const messages = Array.isArray(res2.SearchResponse.m) ? res2.SearchResponse.m : [res2.SearchResponse.m];
		const msgId1 = messages[0].id;

		// Forward first message
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId1}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>${mailSubject}</su>
					<mp ct="text/plain">
						<content>Forwarded message</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(res10.Fault, 'Forward should not be a Fault');

		// Reply to first message
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId1}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su>${mailSubject}</su>
					<mp ct="text/plain">
						<content>Reply message</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(res11.Fault, 'Reply should not be a Fault');

		// Forward and reply second message
		const msgId2 = messages.length > 1 ? messages[1].id : msgId1;
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId2}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>${mailSubject}</su>
					<mp ct="text/plain">
						<content>Another forwarded message</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(res12.Fault, 'Forward should not be a Fault');

		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId2}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su>${mailSubject}</su>
					<mp ct="text/plain">
						<content>Another reply message</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(res13.Fault, 'Reply should not be a Fault');
	});


	it('Functional | Verify that a search for query is - forwarded is successful (Bug: 3345)', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query is - replied is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query (is - replied OR is - forwarded) and vice-versa is successful (Bug: 3345)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:replied OR is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:forwarded OR is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query is - replied AND is - forwarded and vice-versa is successful (Bug: 3345)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:replied AND is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:forwarded AND is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query NOT is - replied is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query NOT is - forwarded is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query NOT (is - replied OR is - forwarded) is successful', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT (is:replied OR is:forwarded) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT (is:forwarded OR is:replied) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for query NOT (is - replied AND is - forwarded) is successful', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT (is:replied AND is:forwarded) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> NOT (is:forwarded AND is:replied) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query is - forwarded is successful (Bug: 3345)', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query is - replied is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query (is - replied OR is - forwarded) and vice-versa is successful (Bug: 3345)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:replied OR is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:forwarded OR is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query is - replied AND is - forwarded and vice-versa is successful (Bug: 3345)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:replied AND is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> is:forwarded AND is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query NOT is - replied is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT is:replied </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query NOT is - forwarded is successful', async () => {
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT is:forwarded </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query NOT (is - replied OR is - forwarded) is successful', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT (is:replied OR is:forwarded) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT (is:forwarded OR is:replied) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that a search for conversation with query NOT (is - replied AND is - forwarded) is successful', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT (is:replied AND is:forwarded) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query> NOT (is:forwarded AND is:replied) </query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
