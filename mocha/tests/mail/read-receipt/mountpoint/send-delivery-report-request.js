import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Read Receipt > Mountpoint > Send Delivery Report Request', function () {
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
	it('Sanity | Verify SendDeliveryReportRequest for a message in a mountpoint', async () => {
		// Create test accounts
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		const acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		const acct3Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const createAcct2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct2.Fault, 'CreateAccountRequest should not fault');
		const acct2Id = (Array.isArray(createAcct2.CreateAccountResponse.account) ? createAcct2.CreateAccountResponse.account[0] : createAcct2.CreateAccountResponse.account).id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account2 and share mailbox with account3
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="1" op="grant">
					<grant d="${acct3Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, acct2AuthToken
		);
		assert.notExists(shareRes.Fault, 'FolderActionRequest should not fault');

		// Add a message with Disposition-Notification-To header to account2
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

		// Login as account3
		const acct3AuthToken = await soap.getAccountAuthToken(acct3Email);

		// Get message from account2's mailbox via delegated access
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${acct2Id}:${messageId}"/>
			</GetMsgRequest>`, acct3AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify read receipt email element does not appear
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailElements = Array.isArray(msg.e) ? msg.e : (msg.e ? [msg.e] : []);
		const readReceiptElement = emailElements.find(e => e.t === 'n');
		assert.notExists(readReceiptElement, 'Read receipt email element should NOT appear in mountpoint');

		// Send delivery report via mountpoint
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${acct2Id}:${messageId}"/>`, acct3AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');

		// Login as account1 and verify receipt was received
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		assert.exists(msgs[0], 'Receipt message should be found');
		const receiptId = msgs[0].id;

		// Get receipt and verify subject
		const getReceiptRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${receiptId}"/>
			</GetMsgRequest>`, acct1AuthToken
		);
		assert.notExists(getReceiptRes.Fault, 'GetMsgRequest should not fault');
		const getReceiptMsg = Array.isArray(getReceiptRes.GetMsgResponse.m) ? getReceiptRes.GetMsgResponse.m[0] : getReceiptRes.GetMsgResponse.m;
		assert.match(getReceiptMsg.su, /Read-Receipt:.*/, 'Subject should start with Read-Receipt:');
	});
});
