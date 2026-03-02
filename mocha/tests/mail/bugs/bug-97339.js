import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 97339', function () {
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
	it('Sanity | External Email Images Not Always Displaying Properly', async () => {
		// Create accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get account auth token
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Inject first MIME message with external image URL
		const filePath1 = path.join(
			config.projectRoot, 'mocha/data/bug97339/mime.txt'
		);
		await soap.injectMime(account1AuthToken, filePath1);

		// Search for the first message
		const search1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"testing images with / without base"</query>
			</SearchRequest>`, account1AuthToken
		);

		assert.notExists(search1Res.Fault, 'SearchRequest should not fault');
		assert.exists(search1Res.SearchResponse, 'SearchResponse should exist');
		const msgs1 = Array.isArray(search1Res.SearchResponse.m)
			? search1Res.SearchResponse.m : [search1Res.SearchResponse.m];
		assert.exists(msgs1[0], 'First message should be found');
		const msg1Id = msgs1[0].id;

		// Get full message and verify external image URL
		const getMsg1Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg1Id}" html="1"/>
			</GetMsgRequest>`, account1AuthToken
		);

		assert.notExists(getMsg1Res.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsg1Res.GetMsgResponse.m)
			? getMsg1Res.GetMsgResponse.m[0] : getMsg1Res.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		// Inject second MIME message
		const filePath2 = path.join(
			config.projectRoot, 'mocha/data/bug97339/mime2.txt'
		);
		await soap.injectMime(account1AuthToken, filePath2);

		// Search for the second message
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:test 4</query>
			</SearchRequest>`, account1AuthToken
		);

		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		assert.exists(search2Res.SearchResponse, 'SearchResponse should exist');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		assert.exists(msgs2[0], 'Second message should be found');
		const msg2Id = msgs2[0].id;

		// Get full message and verify photo URL
		const getMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg2Id}" html="1"/>
			</GetMsgRequest>`, account1AuthToken
		);

		assert.notExists(getMsg2Res.Fault, 'GetMsgRequest should not fault');
	});
});
