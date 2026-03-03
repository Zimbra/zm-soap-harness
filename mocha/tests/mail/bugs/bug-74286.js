import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 74286', function () {
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
	it('Sanity | Attachment mimetype appledouble', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Inject the MIME message
		const filePath = path.join(config.projectRoot, 'mocha/data/bug74286/74286.txt');
		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		await soap.injectMime(accountAuthToken, filePath);

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>"Cassini Solstice FY 13-14 SOW"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify the message was found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should be found');
		const msgId = msgs[0].id;

		// Get the full message and verify attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify message and attachment details
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.match(msg.su, /.*Cassini Solstice FY 13-14 SOW/, 'Subject should match');

		// Verify attachment with applefile content type
		const mp = Array.isArray(msg.mp) ? msg.mp[0] : msg.mp;
		const parts = Array.isArray(mp.mp) ? mp.mp : [mp.mp];
		const applePart = parts.find(p => p && p.ct === 'application/applefile');
		assert.exists(applePart, 'Apple file attachment should exist');
		assert.equal(applePart.filename, 'Hansen_Cassini_SOW.doc',
			'Attachment filename should match');
		assert.equal(applePart.cd, 'attachment', 'Content disposition should be attachment');
	});
});
