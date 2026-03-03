import path from 'node:path';
import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Msg LMTP Inject Multinode', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101_MULTINODE|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | MsgLmptInjectMultinode01 - Inject to Host A for Account A1, verify A1 receives message', async function () {
		const serverAName = config.mailboxServerHost1;
		const serverBName = config.mailboxServerHost2;
		const cosName = 'multinodecosA.' + common.getUniqueString();

		// Get server IDs
		const serversRes = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllServersRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);
		assert.notExists(serversRes.Fault, 'GetAllServersRequest should not fault');
		const servers = Array.isArray(serversRes.GetAllServersResponse.server)
			? serversRes.GetAllServersResponse.server
			: [serversRes.GetAllServersResponse.server];
		const serverA = servers.find(s => s.name === serverAName);
		const serverB = servers.find(s => s.name === serverBName);
		assert.exists(serverA, `Server A (${serverAName}) should exist`);
		assert.exists(serverB, `Server B (${serverBName}) should exist`);

		// Create COS with server pool
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverA.id}</a>
				<a n="zimbraMailHostPool">${serverB.id}</a>
			</CreateCosRequest>`, adminAuthToken);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// Create Account A1 on Host A
		const accountA1Email = `multihostA.${common.getUniqueString()}@${testDomain}`;
		const createA1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraMailHost">${serverAName}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createA1Res.Fault, 'CreateAccountRequest should not fault');

		// Get auth token for account A1
		const accountA1AuthToken = await soap.getAccountAuthToken(accountA1Email);

		// Inject MIME message using injectMime
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/lmtp-basic01.txt');
		await soap.injectMime(accountA1AuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountA1AuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'SearchResponse should contain message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.isString(msgs[0].id, 'Message should have an id');
	});


	it('Sanity | MsgLmptInjectMultinode02 - Inject to Host B for Account B1, verify B1 receives message', async function () {
		const serverAName = config.mailboxServerHost1;
		const serverBName = config.mailboxServerHost2;
		const cosName = 'multinodecosB.' + common.getUniqueString();

		// Get server IDs
		const serversRes = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllServersRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);
		assert.notExists(serversRes.Fault, 'GetAllServersRequest should not fault');
		const servers = Array.isArray(serversRes.GetAllServersResponse.server)
			? serversRes.GetAllServersResponse.server
			: [serversRes.GetAllServersResponse.server];
		const serverA = servers.find(s => s.name === serverAName);
		const serverB = servers.find(s => s.name === serverBName);
		assert.exists(serverA, `Server A (${serverAName}) should exist`);
		assert.exists(serverB, `Server B (${serverBName}) should exist`);

		// Create COS with server pool
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraMailHostPool">${serverA.id}</a>
				<a n="zimbraMailHostPool">${serverB.id}</a>
			</CreateCosRequest>`, adminAuthToken);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// Create Account B1 on Host B
		const accountB1Email = `multihostB.${common.getUniqueString()}@${testDomain}`;
		const createB1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraMailHost">${serverBName}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createB1Res.Fault, 'CreateAccountRequest should not fault');

		// Get auth token for account B1
		const accountB1AuthToken = await soap.getAccountAuthToken(accountB1Email);

		// Inject MIME message using injectMime
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/lmtp-basic01.txt');
		await soap.injectMime(accountB1AuthToken, filePath);

		// Search for injected message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountB1AuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'SearchResponse should contain message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.isString(msgs[0].id, 'Message should have an id');
	});
});
