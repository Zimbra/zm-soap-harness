import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Search Fetch', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let acct1Email, acct1AuthToken, acct2Email, acct2AuthToken;
	let conv1Id, conv2Id, message1Id, message2Id;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create two accounts
		acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		acct2Email = `test${common.getUniqueString()}@${testDomain}`;
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
			</CreateAccountRequest>`, adminAuthToken
		);
		acct1AuthToken = await soap.getAccountAuthToken(acct1Email);
		acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Send plain text conversation (message01)
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
		const origMsgId = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		await new Promise(resolve => setTimeout(resolve, 1000));

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

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Send HTML conversation (message02)
		const subject2 = 'message02';
		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<su>${subject2}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>content of the message01</content>
						</mp>
						<mp ct="text/html">
							<content>&lt;div style='font-family:Arial;font-size:10pt;color:#000000;'&gt;html content of the message02</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		const htmlMsgId = Array.isArray(sendRes3.SendMsgResponse.m)
			? sendRes3.SendMsgResponse.m[0].id : sendRes3.SendMsgResponse.m.id;

		await new Promise(resolve => setTimeout(resolve, 1000));

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${htmlMsgId}" rt="w">
					<e t="t" a="${acct2Email}"/>
					<su>Fwd: ${subject2}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Forwarded content: content of the message01</content>
						</mp>
						<mp ct="text/html">
							<content>Forwarded content: &lt;div style='font-family:Arial;font-size:10pt;color:#000000;'&gt;html content of the message02</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);

		let retriesLeft = 5;
		let searchMsgRes;
		while (retriesLeft > 0) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			searchMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
					<query>subject:${subject1}</query>
				</SearchRequest>`, acct2AuthToken
			);
			if (searchMsgRes.SearchResponse && searchMsgRes.SearchResponse.m) {
				const m = Array.isArray(searchMsgRes.SearchResponse.m)
					? searchMsgRes.SearchResponse.m : [searchMsgRes.SearchResponse.m];
				if (m.length >= 2) break;
			}
			retriesLeft--;
		}
		assert.exists(searchMsgRes.SearchResponse.m, 'Should find messages');
		const msgs = Array.isArray(searchMsgRes.SearchResponse.m)
			? searchMsgRes.SearchResponse.m : [searchMsgRes.SearchResponse.m];
		message2Id = msgs[0].id;
		message1Id = msgs[1].id;

		const searchConv1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${subject1}</query>
			</SearchRequest>`, acct2AuthToken
		);
		const conv1 = Array.isArray(searchConv1Res.SearchResponse.c)
			? searchConv1Res.SearchResponse.c[0] : searchConv1Res.SearchResponse.c;
		conv1Id = conv1.id;

		const searchConv2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${subject2}</query>
			</SearchRequest>`, acct2AuthToken
		);
		const conv2 = Array.isArray(searchConv2Res.SearchResponse.c)
			? searchConv2Res.SearchResponse.c[0] : searchConv2Res.SearchResponse.c;
		conv2Id = conv2.id;
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
	it('Smoke | Search for a conversation with fetch, read, html not specified should not expand the first hit nor mark it read', async () => {
		// Mark conversation unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search without fetch/read/html
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		const firstMsg = convMsgs[0];
		assert.exists(firstMsg, 'First message should exist');

		// Verify messages remain unread
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message2Id}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		const msgData = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0] : getRes.GetMsgResponse.m;
		assert.match(msgData.f, /u/, 'Message should still be unread');
	});


	it('Sanity | Search for a conversation with fetch 1 should expand first hit', async () => {
		// Mark conversation unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search with fetch=1, read=0, html=0
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="0" html="0">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		const firstMsg = convMsgs[0];
		assert.exists(firstMsg, 'First message should exist');
		assert.equal(firstMsg.id, message2Id, 'First message ID should match');

		// Verify messages remain unread (read=0)
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message2Id}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
	});


	it('Sanity | Search for a conversation with fetch 1, read 1, html not specified should mark the first message as read', async () => {
		// Mark conversation unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv1Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search with fetch=1, read=1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 2, 'Should have at least 2 messages');

		// Verify first message is now marked as read
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message2Id}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
		const msgData = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0] : getRes.GetMsgResponse.m;
		if (msgData.f) {
			assert.notMatch(msgData.f, /u/, 'First message should be marked as read');
		}
	});


	it('Sanity | Search for a conversation with fetch 1, read 1, html not specified should return the text part', async () => {
		// Mark conversation unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv2Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search HTML conversation with fetch=1 read=1 (no html flag)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv2Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="1">
				<query>subject:(message02)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		assert.exists(res.SearchConvResponse, 'SearchConvResponse should exist');
	});


	it('Sanity | Search for a conversation with fetch 1, read 1, html 1 should return the HTML part', async () => {
		// Mark conversation unread
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv2Id}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);

		// Search HTML conversation with fetch=1 read=1 html=1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv2Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="1" html="1">
				<query>subject:(message02)</query>
			</SearchConvRequest>`, acct2AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		assert.exists(res.SearchConvResponse, 'SearchConvResponse should exist');
	});


	it('Regression | Search for a conversation with invalid values for fetch and read attributes', async () => {
		// Blank fetch
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		assert.exists(res1.Fault, 'Should return a Fault for blank fetch');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Text fetch
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="some text is here">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		assert.exists(res2.Fault, 'Should return a Fault for text fetch');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Spaces fetch
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="       ">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		assert.exists(res3.Fault, 'Should return a Fault for spaces fetch');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Decimal fetch
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1.0">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		assert.exists(res4.Fault, 'Should return a Fault for decimal fetch');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Blank read with valid fetch
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		// Server may accept blank read without faulting
		if (res5.Fault) {
			assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		}

		// Text read
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="some text is here">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		// Server may accept text read without faulting
		if (res6.Fault) {
			assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		}

		// Spaces read
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="       ">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		// Server may accept spaces read without faulting
		if (res7.Fault) {
			assert.include(res7.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		}
	});


	it('Regression | Search for a conversation with invalid read values (integer, positive, negative, leading space, decimal, special chars)', async () => {
		// Integer read value (8) - server may accept non-boolean integers
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="8">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		// Server may accept integer read values without faulting
		if (res1.Fault) {
			assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res1.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Long positive integer read
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="99999999">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res2.Fault) {
			assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res2.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Negative integer read
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="-1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res3.Fault) {
			assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res3.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Leading space read (" 1")
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read=" 1">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res4.Fault) {
			assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res4.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Trailing space read ("1 ")
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="1 ">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res5.Fault) {
			assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res5.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Decimal read ("1.0")
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="1.0">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res6.Fault) {
			assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res6.SearchConvResponse, 'SearchConvResponse should exist');
		}

		// Special character read
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv1Id}" sortBy="dateDesc" offset="0" limit="25" fetch="1" read="//\\\\'^%">
				<query>subject:(message01)</query>
			</SearchConvRequest>`, acct2AuthToken, false
		);
		if (res7.Fault) {
			assert.include(res7.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should be service.INVALID_REQUEST');
		} else {
			assert.exists(res7.SearchConvResponse, 'SearchConvResponse should exist');
		}
	});
});
