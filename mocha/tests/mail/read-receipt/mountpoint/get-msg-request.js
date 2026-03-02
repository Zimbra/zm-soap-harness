import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Read Receipt > Mountpoint > Get Msg Request', function () {
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
	it('Sanity | Verify email elment for read receipt does not appear on GetMsgRequest in mountpoints', async () => {
		// Create test accounts
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		const acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcct1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct1.Fault, 'CreateAccountRequest should not fault');
		const acct1Id = (Array.isArray(createAcct1.CreateAccountResponse.account) ? createAcct1.CreateAccountResponse.account[0] : createAcct1.CreateAccountResponse.account).id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Share user root folder with account2
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="1" op="grant">
					<grant d="${acct2Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, acct1AuthToken
		);
		assert.notExists(shareRes.Fault, 'FolderActionRequest should not fault');

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
			</AddMsgRequest>`, acct1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Login as account2
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Get message from account1's mailbox via delegated access
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${acct1Id}:${messageId}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		// Verify read receipt email element does NOT appear in mountpoint access
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailElements = Array.isArray(msg.e) ? msg.e : (msg.e ? [msg.e] : []);
		const readReceiptElement = emailElements.find(e => e.t === 'n');
		assert.notExists(readReceiptElement, 'Read receipt email element should NOT appear in mountpoint access');
	});
});
