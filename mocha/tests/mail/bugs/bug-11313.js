import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 11313', function () {
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
	it('Functional | Verify bug 11313', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create second account for forwarding
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the MIME message
		const filePath = path.join(config.projectRoot, 'mocha/data/bugs/11313/mimemsg.txt');
		await soap.injectMime(authToken, filePath);

		// Search for the injected message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>Anexo</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should be found');
		const msgId = msg.id;

		// Get the message and verify attachment filename
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Find the attachment part
		const message = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(message, 'Message should exist in GetMsgResponse');
		const parts = JSON.stringify(message.mp);
		assert.include(parts, 'application/vnd.ms-excel', 'Should have Excel attachment');

		// Forward the message - verify no ServiceException
		const forwardRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: Anexo</su>
					<mp ct="text/plain">
						<content>----- Forwarded Message -----</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(forwardRes.Fault, 'Forward SendMsgRequest should not fault');
		const sentMsg = Array.isArray(forwardRes.SendMsgResponse.m)
			? forwardRes.SendMsgResponse.m[0] : forwardRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});
});
