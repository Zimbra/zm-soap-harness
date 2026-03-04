import { assert } from 'chai';
import path from 'path';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > LMTP > Domino > Domino MIME Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountAuthToken;
	let accountEmail;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `lmtp${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
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
	it('Sanity | Verify a MIME message in text format from a Domino Account', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/domino-mail-basic.txt');
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


	it('Sanity | Verify a MIME message with Word Document Attached from a Domino Account 1', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/domino-mail-attachment.txt');
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


	it('Sanity | Verify a MIME message with Word Document Attached from a Domino Account 2', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/domino-mail-image.txt');
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


	it('Sanity | Verify a MIME message with Word Document Attached from a Domino Account 3', async () => {
		// Inject MIME message
		const filePath = path.join(config.data, 'tests/domino-mail-htmlattach.txt');
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
