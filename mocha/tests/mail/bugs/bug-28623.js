import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 28623', function () {
	this.timeout(120 * 1000);
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
	it('Functional | Login as the appropriate test account', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Verify auth token is valid
		assert.exists(authToken, 'Auth token should exist');
	});


	it('Functional | Verify bug 28623', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject MIME files
		const file1 = path.join(config.projectRoot, 'mocha/data/28623/msg1.txt');
		const file2 = path.join(config.projectRoot, 'mocha/data/28623/msg2.txt');
		const file3 = path.join(config.projectRoot, 'mocha/data/28623/msg3.txt');
		await soap.injectMime(authToken, `${file1},${file2},${file3}`);

		// Search and verify first message (problems1)
		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(problems1)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes1.Fault, 'SearchRequest for problems1 should not fault');
		const msg1 = Array.isArray(searchRes1.SearchResponse.m)
			? searchRes1.SearchResponse.m[0] : searchRes1.SearchResponse.m;
		assert.exists(msg1, 'Message problems1 should be found');

		// Get first message
		const getRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg1.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getRes1.Fault, 'GetMsgRequest for msg1 should not fault');
		const getMsg = Array.isArray(getRes1.GetMsgResponse.m)
			? getRes1.GetMsgResponse.m[0] : getRes1.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');

		// Search and verify second message (happy)
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(happy)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest for happy should not fault');
		const msg2 = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m[0] : searchRes2.SearchResponse.m;
		assert.exists(msg2, 'Message happy should be found');

		// Get second message
		const getRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg2.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getRes2.Fault, 'GetMsgRequest for msg2 should not fault');

		// Search and verify third message (human)
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(human)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes3.Fault, 'SearchRequest for human should not fault');
		const msg3 = Array.isArray(searchRes3.SearchResponse.m)
			? searchRes3.SearchResponse.m[0] : searchRes3.SearchResponse.m;
		assert.exists(msg3, 'Message human should be found');

		// Get third message
		const getRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg3.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getRes3.Fault, 'GetMsgRequest for msg3 should not fault');
	});
});
