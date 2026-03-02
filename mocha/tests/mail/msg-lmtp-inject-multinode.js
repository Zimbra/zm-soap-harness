import { assert } from 'chai';
import path from 'path';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Msg LMTP Inject Multinode', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | MsgLmptInjectMultinode01 - Inject to Host A for Account A1, verify A1 receives message', async function () {
		// Find hosts
		const hostARes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllServersRequest xmlns="urn:zimbraAdmin">
				<server by="name">${config.serverName}</server>
			</GetAllServersRequest>`, adminAuthToken
		);
		const servers = hostARes.GetAllServersResponse.server;
		if (!servers || servers.length < 2) {
			this.skip('Test requires at least 2 mailbox servers (Multi-Node)');
			return;
		}

		const hostA = servers[0].name;

		// Create Account A1 on Host A
		const accountA1Email = `multihostA.${common.getUniqueString()}@${testDomain}`;
		const createA1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${hostA}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createA1Res.Fault, 'CreateAccountRequest should not fault');

		const senderEmail = `sender${common.getUniqueString()}@test.com`;
		const subject = `MultiHost testing subject line ${common.getUniqueString()}`;

		// Use soap.injectMime to simulate LMTP injection directly to the account
		const filePath = path.join(config.projectRoot, 'data/testmailraw/37018/lmtp-basic01.txt');
		await soap.injectMime(accountA1AuthToken, filePath);

		// Verify Account A1 receives the injected message
		const accountA1AuthToken = await soap.getAccountAuthToken(accountA1Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:("${subject}")</query>
			</SearchRequest>`, accountA1AuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'SearchResponse should contain message');
		assert.isString(msgs[0].id, 'Message should have an id');
	});


	it('Sanity | MsgLmptInjectMultinode02 - Inject to Host B for Account B1, verify B1 receives message', async function () {
		// Find hosts
		const hostARes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllServersRequest xmlns="urn:zimbraAdmin">
				<server by="name">${config.serverName}</server>
			</GetAllServersRequest>`, adminAuthToken
		);
		const servers = hostARes.GetAllServersResponse.server;
		if (!servers || servers.length < 2) {
			this.skip('Test requires at least 2 mailbox servers (Multi-Node)');
			return;
		}

		const hostB = servers[1].name;

		// Create Account B1 on Host B
		const accountB1Email = `multihostB.${common.getUniqueString()}@${testDomain}`;
		const createB1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailHost">${hostB}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createB1Res.Fault, 'CreateAccountRequest should not fault');

		const senderEmail = `sender${common.getUniqueString()}@test.com`;
		const subject = `MultiHost testing subject line ${common.getUniqueString()}`;

		// Use soap.injectMime to simulate LMTP injection directly to the account
		const filePath = path.join(config.projectRoot, 'data/testmailraw/37018/lmtp-basic01.txt');
		await soap.injectMime(accountB1AuthToken, filePath);

		// Verify Account B1 receives the injected message
		const accountB1AuthToken = await soap.getAccountAuthToken(accountB1Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:("${subject}")</query>
			</SearchRequest>`, accountB1AuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'SearchResponse should contain message');
		assert.isString(msgs[0].id, 'Message should have an id');
	});
});
