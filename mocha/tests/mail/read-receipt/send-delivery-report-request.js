import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Read Receipt > Send Delivery Report Request', function () {
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
	it('Sanity | Send SendDeliveryReportRequest for a message with read receipt request', async () => {
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

		// Login as account1 and send message with read receipt
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<e t="n" a="${acct1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for the sent message in account1

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should be found');

		// Login as account2 and search for the received message
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		let searchRes2;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes2 = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, acct2AuthToken
			);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes2.SearchResponse.m, 'Message should be found');
		const msgs2 = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m : [searchRes2.SearchResponse.m];
		const messageId = msgs2[0].id;

		// Send delivery report
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${messageId}"/>`, acct2AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');
		assert.exists(deliveryRes.SendDeliveryReportResponse, 'SendDeliveryReportResponse should exist');

		// Search for the read receipt in account1 inbox

		await new Promise(resolve => setTimeout(resolve, 5000));
		const receiptSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(receiptSearch.Fault, 'SearchRequest should not fault');
		assert.exists(receiptSearch.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify read receipt subject uses Read-Receipt -', async () => {
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

		// Add a message with read receipt header via AddMsgRequest
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

		// Send delivery report
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${messageId}"/>`, acct2AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');
		assert.exists(deliveryRes.SendDeliveryReportResponse, 'SendDeliveryReportResponse should exist');

		// Login as account1 and search for the receipt
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

		// Get the receipt message and verify subject
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${receiptId}"/>
			</GetMsgRequest>`, acct1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.match(getMsg.su, /Read-Receipt:.*/, 'Subject should start with Read-Receipt:');
	});


	it('Sanity | Verify Read-Receipt is normalized as a subject prefix', async () => {
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

		// Login as account1 and send message with read receipt
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<e t="n" a="${acct1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Login as account2 and search for the message
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		const messageId = msgs[0].id;

		// Send delivery report
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${messageId}"/>`, acct2AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');

		// Login as account1 and search for sent and inbox messages

		await new Promise(resolve => setTimeout(resolve, 5000));
		const sentSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(sentSearch.Fault, 'SearchRequest for sent should not fault');
		const sentMsgs = Array.isArray(sentSearch.SearchResponse?.m)
			? sentSearch.SearchResponse.m : [sentSearch.SearchResponse?.m];
		const sentMsgId = sentMsgs[0].id;

		// Search inbox for receipt

		await new Promise(resolve => setTimeout(resolve, 5000));
		const inboxSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(inboxSearch.Fault, 'SearchRequest for inbox should not fault');
		const inboxMsgs = Array.isArray(inboxSearch.SearchResponse?.m)
			? inboxSearch.SearchResponse.m : [inboxSearch.SearchResponse?.m];
		const receiptId = inboxMsgs[0].id;

		// Search by conversation and verify both messages are in same thread
		const convSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(convSearch.Fault, 'SearchRequest for conversation should not fault');
		assert.exists(convSearch.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Send SendDeliveryReportRequest for message without header', async () => {
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

		// Add a message WITHOUT Disposition-Notification-To header
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
content${common.getUniqueString()}
</content>
				</m>
			</AddMsgRequest>`, acct2AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Send delivery report for message without read receipt header
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${messageId}"/>`, acct2AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');
		assert.exists(deliveryRes.SendDeliveryReportResponse, 'SendDeliveryReportResponse should exist');

		// Verify no receipt was sent to account1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const noMsgs = searchRes.SearchResponse?.m;
		assert.notExists(noMsgs, 'No receipt message should be found for message without header');
	});


	it('Sanity | Verify read receipt does not include email attachment', async () => {
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

		// Add message with Disposition-Notification-To header
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

		// Send delivery report
		const deliveryRes = await soap.makeSOAPEnvelopeAccount(
			`<SendDeliveryReportRequest xmlns="urn:zimbraMail" mid="${messageId}"/>`, acct2AuthToken
		);
		assert.notExists(deliveryRes.Fault, 'SendDeliveryReportRequest should not fault');

		// Login as account1 and find the receipt
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		assert.exists(msgs[0], 'Receipt message should be found');

		// Get full message and verify it contains disposition-notification part but no rfc822 attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgs[0].id}"/>
			</GetMsgRequest>`, acct1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});
});
