import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 55073', function () {
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
	it('Sanity | Verify Chinese attachment file name', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with Chinese filename attachment
		const subject = `subject${common.getUniqueString()}`;
		const chineseFilename = '国务院办公厅关于2011年部分节假日安排的通知.doc';
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: test@testmime.com
To: ${accountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary55073"
--boundary55073
Content-Type: text/plain; charset="utf-8"
Test message with Chinese filename
--boundary55073
Content-Type: application/msword; name="=?UTF-8?B?5Zu95Yqh6Zmi5Yqe5YWs5Y6F5YWz5LqOMjAxMeW5tOmDqOWIhuiKguWBh+aXpeWuieaOkueahOmAmuefpS5kb2M=?="
Content-Disposition: attachment; filename="=?UTF-8?B?5Zu95Yqh6Zmi5Yqe5YWs5Y6F5YWz5LqOMjAxMeW5tOmDqOWIhuiKguWBh+aXpeWuieaOkueahOmAmuefpS5kb2M=?="
Content-Transfer-Encoding: base64
dGVzdA==
--boundary55073--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');

		// Get the message and verify Chinese filename
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');

		// Verify attachment has Chinese filename
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const findFilename = (mp) => {
			if (!mp) return false;
			const parts = Array.isArray(mp) ? mp : [mp];
			for (const p of parts) {
				if (p.filename && p.filename.includes('国务院')) return true;
				if (p.mp && findFilename(p.mp)) return true;
			}
			return false;
		};
		assert.isTrue(findFilename(msg.mp), `Should find attachment with Chinese filename`);
	});
});
