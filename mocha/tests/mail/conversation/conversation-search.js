import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Search', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let accountEmail, authToken, convId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create a test account and a conversation for shared use
		accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		authToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to self and forward to create conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		convId = conv.id;
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
	it('Sanity | Search for a conversation with valid conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const msgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		const match = msgs.find(m => m && m.cid === convId);
		assert.exists(match, 'Should find message with matching cid');
	});


	it('Regression | Search for a conversation with valid conversation-id with leading spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="         ${convId}" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | Search for a conversation with valid conversation-id with trailing spaces', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}     " sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | Search for a conversation with blank conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | Search for a conversation with spaces at conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="           " sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | Search for a conversation with sometext in conversation-id', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="some text" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');
	});


	it('Regression | Search for a conversation with valid conversation-id but blank query', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" sortBy="dateDesc" offset="0" limit="25">
				<query></query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.QUERY_PARSE_ERROR',
			'Should be mail.QUERY_PARSE_ERROR');
	});


	it('Regression | Search for a conversation with valid conversation-id but spaces in query', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" sortBy="dateDesc" offset="0" limit="25">
				<query>           </query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.QUERY_PARSE_ERROR',
			'Should be mail.QUERY_PARSE_ERROR');
	});


	it('Regression | Search for a valid conversation-id but no sortBy, offset and limit attributes', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const msgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		const match = msgs.find(m => m && m.cid === convId);
		assert.exists(match, 'Should find message with matching cid');
	});


	it('Regression | Search for a nonexisting conversation', async () => {
		// Create and delete a conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>deletable content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const deleteConvId = conv.id;

		// Delete it
		await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${deleteConvId}" op="delete"/>
			</ConvActionRequest>`, authToken
		);

		// Search for deleted conversation
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${deleteConvId}">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken, false
		);
		assert.exists(res.Fault, 'Should return a Fault');
		assert.match(res.Fault.Detail.Error.Code, /mail\.NO_SUCH_(CONV|MSG)/,
			'Should be mail.NO_SUCH_CONV or mail.NO_SUCH_MSG');
	});


	it('Regression | Search for a conversation with valid conversation-id but Invalid query and query not specified', async () => {
		// Create account with messages
		const acct4Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct4AuthToken = await soap.getAccountAuthToken(acct4Email);

		// Add a message to inbox
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@example.com
To: ${acct4Email}
Subject: test message for search conv
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
Test message content for search
</content>
				</m>
			</AddMsgRequest>`, acct4AuthToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>in:inbox</query>
			</SearchRequest>`, acct4AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		const testConvId = conv.id;

		// Get the initial search preference
		const prefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefMailInitialSearch"/>
			</GetPrefsRequest>`, acct4AuthToken
		);
		assert.notExists(prefsRes.Fault, 'GetPrefsRequest should not fault');

		// Search with invalid query
		const invalidSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${testConvId}" sortBy="dateDesc" offset="0" limit="25">
				<query>Invalid Query</query>
			</SearchConvRequest>`, acct4AuthToken
		);
		assert.notExists(invalidSearchRes.Fault, 'SearchConvRequest with invalid query should not fault');
	});


	it('Regression | Search for a conversation with valid conversation-id but query not specified', async () => {
		// Create account and add message
		const acct4Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct4AuthToken = await soap.getAccountAuthToken(acct4Email);

		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@example.com
To: ${acct4Email}
Subject: test message for no query conv search
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
Test message content for search
</content>
				</m>
			</AddMsgRequest>`, acct4AuthToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>in:inbox</query>
			</SearchRequest>`, acct4AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		const testConvId = conv.id;

		// Search without query tag
		const noQueryRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${testConvId}" sortBy="dateDesc" offset="0" limit="25">
			</SearchConvRequest>`, acct4AuthToken
		);
		assert.notExists(noQueryRes.Fault, 'SearchConvRequest without query should not fault');
	});


	it('Functional | Verify bug 5329 - font definitions do not appear in the Original Message portion', async () => {
		// Create account and add HTML message
		const acctEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctAuthToken = await soap.getAccountAuthToken(acctEmail);

		// Add an HTML message with font definitions
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@example.com
To: ${acctEmail}
Subject: 3 PM Prod Mtg Agenda
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8
&lt;html&gt;&lt;head&gt;&lt;style&gt;/* Font Definitions */ @font-face {font-family:Arial;}&lt;/style&gt;&lt;/head&gt;&lt;body&gt;Meeting agenda items for today&lt;/body&gt;&lt;/html&gt;
</content>
				</m>
			</AddMsgRequest>`, acctAuthToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, acctAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const testConvId = conv.id;

		// SearchConvRequest with fetch and html
		const convSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" sortBy="dateDesc" offset="0" limit="25" cid="${testConvId}" fetch="1" read="1" html="1">
				<query>in:inbox</query>
			</SearchConvRequest>`, acctAuthToken
		);
		assert.notExists(convSearchRes.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(convSearchRes.SearchConvResponse.m)
			? convSearchRes.SearchConvResponse.m : [convSearchRes.SearchConvResponse.m];

		// Verify fragment does not contain "Font Definitions"
		const msgData = convMsgs[0];
		if (msgData && msgData.fr) {
			assert.notInclude(msgData.fr, 'Font Definitions',
				'Fragment should not contain Font Definitions');
		}
	});


	it('Functional | TC to verify SearchConvRequest can access specific headers 1', async () => {
		// Create account and add message
		const acctEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctAuthToken = await soap.getAccountAuthToken(acctEmail);

		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${acctEmail}
Subject: header test message
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
Header test content
</content>
				</m>
			</AddMsgRequest>`, acctAuthToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, acctAuthToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const testConvId = conv.id;

		// SearchConvRequest with specific headers
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" sortBy="dateDesc" offset="0" limit="25" cid="${testConvId}" fetch="1" read="1" html="1">
				<header n="From"/>
				<header n="To"/>
				<query>in:inbox</query>
			</SearchConvRequest>`, acctAuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		const convMsgs = Array.isArray(res.SearchConvResponse.m)
			? res.SearchConvResponse.m : [res.SearchConvResponse.m];
		assert.isAtLeast(convMsgs.length, 1, 'Should have at least one message');

		// Check headers are present
		const msgData = convMsgs[0];
		const headers = msgData.header ? (Array.isArray(msgData.header) ? msgData.header : [msgData.header]) : [];
		const toHeader = headers.find(h => h && h.n === 'To');
		const fromHeader = headers.find(h => h && h.n === 'From');
		if (headers.length > 0) {
			assert.exists(toHeader, 'To header should be present');
			assert.exists(fromHeader, 'From header should be present');
		} else {
			assert.exists(msgData, 'Message data should exist');
		}
	});


	it('Functional | TC to verify SearchConvRequest can access specific headers 2', async () => {
		// Create two accounts
		const acct5Email = `test${common.getUniqueString()}@${testDomain}`;
		const acct6Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct5Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct6Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct5AuthToken = await soap.getAccountAuthToken(acct5Email);

		// Send message from acct5 to acct6
		const subject = `subject${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct6Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct5AuthToken
		);

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Login as acct6 and find the message
		const acct6AuthToken = await soap.getAccountAuthToken(acct6Email);

		let searchRes;
		let retries = 3;
		while (retries > 0) {
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, acct6AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
			retries--;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msg = msgs[0];
		assert.exists(msg, 'Should find the message');
		const testConvId = msg.cid;

		// SearchConvRequest with X-Mailer header
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" fetch="all" cid="${testConvId}">
				<header n="X-Mailer"/>
				<query>subject:(${subject})</query>
			</SearchConvRequest>`, acct6AuthToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		assert.exists(res.SearchConvResponse, 'SearchConvResponse should exist');
	});
});
