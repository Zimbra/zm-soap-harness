import { assert } from 'chai';
import path from 'path';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > LMTP > Missing Attribute > LMTP Missing Attribute MIME', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountAuthToken;
	let accountEmail;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `lmtp${common.getUniqueString()}@${config.testDomain}`;
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
	it('Regression | Verify a message with missing to field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-to-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});


	it('Regression | Verify a message with missing from field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-from-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});


	it('Regression | Verify a message with missing subject field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-subject-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});


	it('Regression | Verify a message with missing MIME-Version field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-mimeversion-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});


	it('Regression | Verify a message with missing Content-Transfer-Encoding field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-encoding-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});


	it('Regression | Verify a message with missing Content-Type field', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/lmtp-contentType-missing.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist in inbox');
		const msgId = msgs[msgs.length - 1].id;

		// Get the full message
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify the message content
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getRes.GetMsgResponse.m[0], 'Message should be returned');
	});
});
