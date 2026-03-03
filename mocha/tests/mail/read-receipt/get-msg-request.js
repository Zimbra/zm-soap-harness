import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Read Receipt > Get Msg Request', function () {
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
	it('Sanity | Verify email elment on GetMsgRequest', async () => {
		// Create test accounts
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		const acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSendReadReceipts">always</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account2
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Add a message with Disposition-Notification-To header
		const subject = `subject${common.getUniqueString()}`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Date: Thu, 10 Sep 2009 15:39:51 -0700 (PDT)
From: ${acct1Email}
To: ${acct2Email}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
Disposition-Notification-To: ${acct1Email}
content${common.getUniqueString()}
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Get the message and verify read receipt email element
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailElements = Array.isArray(msg.e) ? msg.e : (msg.e ? [msg.e] : []);
		const readReceiptElement = emailElements.find(e => e && e.t === 'n');
		assert.exists(readReceiptElement, 'Read receipt email element should exist');
		assert.equal(readReceiptElement.a, acct1Email, 'Read receipt address should match sender');
	});
});
