import { assert } from 'chai';
import path from 'path';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > LMTP > Attachments > MIME Attachment', function () {
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
	it('Smoke | Verify a message without attachment can be injected', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/testmailzimbra.txt');
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


	it('Sanity | Verify a message with attachment can be injected', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/attachmentzimbra.txt');
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


	it('Functional | Verify a message with attachment (GIF) can be injected', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/attachmentzimbragif.txt');
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
