import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 30428', function () {
	this.timeout(120 * 1000);
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
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Checking if i am getting a response to the injected message 1', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject MIME with 2231 encoded filename
		const filePath = path.join(config.projectRoot, 'mocha/data/bugs/30428/char-boundary-2231-filename-30428.txt');
		await soap.injectMime(authToken, filePath);

		// Search by content
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>こんにちは、世界！</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should be found');
		const msgId = msg.id;

		// Get message and verify fragment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.include(getMsg.fr, 'こんにちは、世界！', 'Fragment should contain expected text');

		// Search by filename
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>filename:(こんにちは、世界！.pdf)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest by filename should not fault');
		const msg2 = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m[0] : searchRes2.SearchResponse.m;
		assert.exists(msg2, 'Message should be found by filename');

		// Get message and verify attachment
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg2.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes2.Fault, 'GetMsgRequest should not fault');
		const getMsg2 = Array.isArray(getMsgRes2.GetMsgResponse.m) ? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		const parts = JSON.stringify(getMsg2.mp);
		assert.include(parts, 'application/pdf', 'Should have PDF content type');
		assert.include(parts, 'こんにちは、世界！.pdf', 'Should have Japanese filename');
	});


	it('Sanity | Checking if i am getting a response to the injected message 2', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject MIME with cp1252 encoded content
		const filePath = path.join(config.projectRoot, 'mocha/data/bugs/30433/msg02.txt');
		await soap.injectMime(authToken, filePath);

		// Search by subject
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Make Your Job Easier)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should be found');
		assert.include(msg.fr, "We're sure you'll agree that it's", 'Fragment should contain expected text');

		// Get message and verify content
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const content = JSON.stringify(getMsg.mp);
		assert.include(content, "We're sure you'll agree that it's", 'Content should contain expected text');
	});
});
