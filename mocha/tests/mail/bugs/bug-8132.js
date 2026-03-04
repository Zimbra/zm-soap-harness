import path from 'node:path';
import fs from 'node:fs';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 8132', function () {
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
	it('Functional | Verify bug 8132 - malformed messages should not throw error', async () => {
		// Create the account
		const accountEmail = `acct1.${common.getUniqueString()}@${testDomain}`;
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

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the malformed MIME messages (individual files, not folder)
		const folderPath = path.join(config.projectRoot, 'mocha/data/bugs/8132');
		const files = fs.readdirSync(folderPath)
			.filter(f => f.endsWith('.txt'))
			.map(f => path.join(folderPath, f))
			.join(',');
		await soap.injectMime(accountAuthToken, files);

		// Search for the first message
		const search1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Why the lack of mixing in support for Class methods)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify first message was found
		assert.notExists(search1Res.Fault, 'SearchRequest should not fault');
		const msgs1 = Array.isArray(search1Res.SearchResponse.m)
			? search1Res.SearchResponse.m : [search1Res.SearchResponse.m];
		assert.exists(msgs1[0], 'First message should be found');
		const msg1Id = msgs1[0].id;

		// Get the full first message
		const getMsg1Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg1Id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsg1Res.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsg1Res.GetMsgResponse.m)
			? getMsg1Res.GetMsgResponse.m[0] : getMsg1Res.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');

		// Search for the second message
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(info required)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify second message was found
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		assert.exists(msgs2[0], 'Second message should be found');
		const msg2Id = msgs2[0].id;

		// Get the full second message
		const getMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg2Id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsg2Res.Fault, 'GetMsgRequest should not fault');
	});
});
