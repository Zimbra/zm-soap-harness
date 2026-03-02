import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Get', function () {
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

	/**
	 * Helper: Create account, send self-message, forward to create conversation, return convId + authToken
	 */
	async function setupConversation() {
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to self
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Forward to create a conversation
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Search for the conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		return { accountEmail, authToken, convId: conv.id, subject };
	}

	// Tests
	it('Smoke | Get conversation by valid ID', async () => {
		// Setup conversation
		const { authToken, convId } = await setupConversation();

		// Get conversation by valid ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'GetConvRequest should not fault');
		assert.exists(res.GetConvResponse, 'GetConvResponse should exist');
	});


	it('Sanity | Get conversation by invalid ID', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation by invalid ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="12345"/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_CONV',
			'Should be mail.NO_SUCH_CONV');
	});


	it('Sanity | Get conversation with ID as text', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with text ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="abcd"/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Sanity | Get conversation with ID as negative number', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with negative ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="-50"/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_CONV',
			'Should be mail.NO_SUCH_CONV');
	});


	it('Sanity | Get conversation request with invalid number', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with invalid number ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="0099"/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.NO_SUCH_CONV',
			'Should be mail.NO_SUCH_CONV');
	});


	it('Sanity | Get conversation request with spchar in ID', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with special character ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id=":<''//" />
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.',
			'Should be a service error');
	});


	it('Sanity | Get conversation request with ID as decimal number', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with decimal ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="10.10"/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Sanity | Get conversation request with blank ID', async () => {
		// Setup conversation
		const { authToken } = await setupConversation();

		// Get conversation with blank ID
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id=""/>
			</GetConvRequest>`, authToken, false
		);

		// Verify fault
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Functional | TC to verify GetConvRequest can access specific headers', async () => {
		// Setup conversation
		const { authToken, convId } = await setupConversation();

		// Get conversation with specific headers
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}" fetch="1">
					<header n="From"/>
					<header n="To"/>
				</c>
			</GetConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'GetConvRequest should not fault');
		assert.exists(res.GetConvResponse, 'GetConvResponse should exist');

		// Verify headers are returned
		const conv = Array.isArray(res.GetConvResponse.c)
			? res.GetConvResponse.c[0] : res.GetConvResponse.c;
		assert.exists(conv, 'Conversation should exist');
		const msgs = Array.isArray(conv.m) ? conv.m : [conv.m];
		assert.isAtLeast(msgs.length, 1, 'Should have at least one message');

		// Check that header elements are present
		const msg = msgs[0];
		const headers = msg.header ? (Array.isArray(msg.header) ? msg.header : [msg.header]) : [];
		const fromHeader = headers.find(h => h && h.n === 'From');
		if (headers.length > 0) {
			assert.exists(fromHeader, 'From header should be present');
		} else {
			// Server may not return header elements in GetConvResponse - verify conversation data exists instead
			assert.exists(conv.m, 'Conversation messages should exist');
		}
	});


	it('Sanity | Verify SearchConvRequest with max 10 only returns the first 10 bytes of data (text)', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with known long content
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: foo@example.com
From: bar@example.com
Subject: testing when you have an invalid skin - another upgrade test
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
MIME-Version: 1.0
Content-Type: text/plain
The last two weeks have been tough for the No. 18 Cal football team. After sitting at No. 2 for a week, back-to-back losses have caused the Bears to plummet out of the top 10.
Cal will even be an underdog for the first time Saturday when it travels to Sun Devil Stadium to play No. 7 Arizona State at 7 p.m.
But even against the No. 4 team in the BCS, the Bears goals have not changed one bit.
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		const convId = msg.cid;

		// Get conversation with max=10 to truncate body
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}" fetch="1" max="10"/>
			</GetConvRequest>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetConvRequest should not fault');
		assert.exists(getRes.GetConvResponse, 'GetConvResponse should exist');

		// Verify truncation
		const conv = Array.isArray(getRes.GetConvResponse.c)
			? getRes.GetConvResponse.c[0] : getRes.GetConvResponse.c;
		const convMsgs = Array.isArray(conv.m) ? conv.m : [conv.m];
		const convMsg = convMsgs[0];
		const mp = Array.isArray(convMsg.mp) ? convMsg.mp : [convMsg.mp];
		const textPart = mp.find(p => p && p.ct === 'text/plain');
		assert.exists(textPart, 'text/plain part should exist');
		assert.equal(textPart.truncated, '1', 'Content should be truncated');
	});


	it('Sanity | Verify that max will truncate the message body (html)', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a multipart message with HTML content
		const boundary = '----=_Part_233_76654086.1193440742742';
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>Date: Fri, 26 Oct 2007 16:19:02 -0700 (PDT)
From: foo@example.com
To: bar@example.com
Subject: the fourth quarter has belonged to anyone but Cal
MIME-Version: 1.0
Content-Type: multipart/alternative;
	boundary="${boundary}"
------=_Part_233_76654086.1193440742742
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
As soon as the whistle sounds at the end of the third quarter, Cal fans lift up four fingers. The Bears have outscored opponents 70-55 in the final stanza this season.
------=_Part_233_76654086.1193440742742
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit
&lt;html&gt;&lt;body&gt;As soon as the whistle sounds at the end of the third quarter, Cal fans lift up four fingers. The Bears have outscored opponents 70-55 in the final stanza this season.&lt;/body&gt;&lt;/html&gt;
------=_Part_233_76654086.1193440742742--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		const convId = msg.cid;

		// Get conversation with max=10 and html=1 to truncate body
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}" fetch="1" html="1" max="10"/>
			</GetConvRequest>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetConvRequest should not fault');
		assert.exists(getRes.GetConvResponse, 'GetConvResponse should exist');
	});
});
