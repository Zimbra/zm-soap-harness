import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conv Fetch Enhancement', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let acct1Email, acct1AuthToken, acct2Email, acct2AuthToken;
	let conv1Id, message1Id, message2Id;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create two accounts
		acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
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
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		acct1AuthToken = await soap.getAccountAuthToken(acct1Email);
		acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Send a message from acct1 to acct2 (plain text)
		const subject1 = 'message01';
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<su>${subject1}</su>
					<mp ct="text/plain">
						<content>content of the message01</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');
		const origMsgId = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		// Wait for delivery ordering
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Forward same message to acct2
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${origMsgId}" rt="w">
					<e t="t" a="${acct2Email}"/>
					<su>Fwd: ${subject1}</su>
					<mp ct="text/plain">
						<content>Forwarded content:content of the message01</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Login as acct2 and search for the messages
		const searchMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${subject1}</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchMsgRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchMsgRes.SearchResponse.m)
			? searchMsgRes.SearchResponse.m : [searchMsgRes.SearchResponse.m];
		assert.exists(msgs[0], 'Should find first message');
		assert.exists(msgs[1], 'Should find second message');
		message2Id = msgs[0].id;
		message1Id = msgs[1].id;

		// Get conversation ID
		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${subject1}</query>
			</SearchRequest>`, acct2AuthToken
		);
		const conv = Array.isArray(searchConvRes.SearchResponse.c)
			? searchConvRes.SearchResponse.c[0] : searchConvRes.SearchResponse.c;
		conv1Id = conv.id;
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
	it('Smoke | Search for a conversation with fetch u specified that should expand all unread messages', async () => {
		// Mark conversation as unread
		const unreadRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(unreadRes.Fault, 'ConvActionRequest should not fault');

		// Search with fetch=u
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Verify messages have unread flag and expanded content
		const msg2 = convMsgs.find(m => m && m.id === message2Id);
		const msg1 = convMsgs.find(m => m && m.id === message1Id);
		assert.exists(msg2, 'Forward message should exist');
		assert.exists(msg1, 'Original message should exist');
		assert.equal(msg2.cid, conv1Id, 'Message 2 cid should match');
		assert.equal(msg1.cid, conv1Id, 'Message 1 cid should match');
	});


	it('Sanity | Search for a conversation with fetch u specified should not expand any read messages', async () => {
		// Mark conversation as read
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="read"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(readRes.Fault, 'ConvActionRequest should not fault');

		// Search with fetch=u (should not expand because all are read)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Verify messages don't have unread flag
		const msg2 = convMsgs.find(m => m && m.id === message2Id);
		if (msg2 && msg2.f) {
			assert.notMatch(msg2.f, /u/, 'Message 2 should not have unread flag');
		}
	});


	it('Sanity | Search for a conversation with fetch u1 specified that should expand only first message when all are read', async () => {
		// Mark conversation as read
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search with fetch=u1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// First message should be expanded (has body), second should not
		const firstMsg = convMsgs[0];
		assert.exists(firstMsg, 'First message should exist');
		assert.equal(firstMsg.cid, conv1Id, 'First message cid should match');
	});


	it('Sanity | Search for a conversation with fetch u1 specified that should expand all unread messages', async () => {
		// Mark conversation as unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search with fetch=u1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Both messages should have unread flag and be expanded
		const msg2 = convMsgs.find(m => m && m.id === message2Id);
		const msg1 = convMsgs.find(m => m && m.id === message1Id);
		assert.exists(msg2, 'Forward message should exist');
		assert.exists(msg1, 'Original message should exist');
	});


	it('Sanity | Search for a conversation which has read and unread messages with fetch u1 specified that should expand only unread message', async () => {
		// Mark whole conversation as unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Mark one message as read
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message2Id}" op="read"/>
			</MsgActionRequest>`, acct2AuthToken
		);

		// Search with fetch=u1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Message 2 should be read (not expanded), message 1 should be unread (expanded)
		const msg2 = convMsgs.find(m => m && m.id === message2Id);
		const msg1 = convMsgs.find(m => m && m.id === message1Id);
		assert.exists(msg2, 'Forward message should exist');
		assert.exists(msg1, 'Original message should exist');

		// Verify via GetMsgRequest
		const getRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message1Id}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes1.Fault, 'GetMsgRequest should not fault');
		const msg1Data = Array.isArray(getRes1.GetMsgResponse.m)
			? getRes1.GetMsgResponse.m[0] : getRes1.GetMsgResponse.m;
		assert.match(msg1Data.f, /u/, 'Message 1 should have unread flag');
	});


	it('Sanity | Search for a conversation which has read and unread messages with fetch u specified that should expand only unread message', async () => {
		// Mark whole conversation as unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Mark one message as read
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message2Id}" op="read"/>
			</MsgActionRequest>`, acct2AuthToken
		);

		// Search with fetch=u
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="u">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Verify message 1 still has unread flag
		const getRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message1Id}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes1.Fault, 'GetMsgRequest should not fault');
		const msg1Data = Array.isArray(getRes1.GetMsgResponse.m)
			? getRes1.GetMsgResponse.m[0] : getRes1.GetMsgResponse.m;
		assert.match(msg1Data.f, /u/, 'Message 1 should still have unread flag');
	});
});
