import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let acct1Email, acct1AuthToken, convId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Add messages to simulate lmtp injection of conv1-file1.txt and conv1-file2.txt
		// These are a 2-message conversation with jpeg attachment
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${acct1Email}
Subject: Subject1
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
MIME-Version: 1.0
Content-Type: multipart/mixed;
	boundary="----=_Part_123_456789.1193440742742"
------=_Part_123_456789.1193440742742
Content-Type: text/plain; charset=utf-8
First message in the conversation.
------=_Part_123_456789.1193440742742
Content-Type: image/jpeg; name="test.jpg"
Content-Disposition: attachment; filename="test.jpg"
Content-Transfer-Encoding: base64
/9j/4AAQSkZJRg==
------=_Part_123_456789.1193440742742--
</content>
				</m>
			</AddMsgRequest>`, acct1AuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMsgRequest should not fault');

		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${acct1Email}
Subject: Re: Subject1
Date: Tue, 23 Oct 2007 10:00:00 -0700 (PDT)
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Another message in the conversation.
</content>
				</m>
			</AddMsgRequest>`, acct1AuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMsgRequest should not fault');
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
	it('Sanity | Search for a mail then get the conversation', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(Subject1)</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		convId = conv.id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, acct1AuthToken
		);
		assert.notExists(getRes.Fault, 'GetConvRequest should not fault');
		const getConv = Array.isArray(getRes.GetConvResponse.c)
			? getRes.GetConvResponse.c[0] : getRes.GetConvResponse.c;
		assert.equal(getConv.n, '2', 'Conversation should have 2 messages');
	});


	it('Sanity | Flag a conversation', async () => {
		// Search and get conv id
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(Subject1)</query>
			</SearchRequest>`, acct1AuthToken
		);
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const testConvId = conv.id;

		// Flag conversation
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${testConvId}" op="flag"/>
			</ConvActionRequest>`, acct1AuthToken
		);
		assert.notExists(flagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(flagRes.ConvActionResponse.action.id, testConvId, 'id should match');

		// Verify flag is set
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${testConvId}"/>
			</GetConvRequest>`, acct1AuthToken
		);
		assert.notExists(getRes.Fault, 'GetConvRequest should not fault');
		assert.exists(getRes.GetConvResponse, 'GetConvResponse should exist');
	});


	it('Functional | Verify bug 4437 - whitespace in subject messages grouped into one conversation (variant 1)', async () => {
		// Create account for this test
		const testEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const testAuthToken = await soap.getAccountAuthToken(testEmail);

		// Add 3 messages with varying whitespace in subject via AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${testEmail}
Subject: How many Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 09:00:00 -0700 (PDT)
Message 1 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: other@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 10:00:00 -0700 (PDT)
Message 2 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: third@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 11:00:00 -0700 (PDT)
Message 3 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		// Search and verify 1 conversation with 3 messages
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(How many Linux servers)</query>
			</SearchRequest>`, testAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		assert.equal(conv.n, '3', 'Conversation should have 3 messages');
	});


	it('Functional | Verify bug 4437 - double space in all subjects grouped into one conversation (variant 2)', async () => {
		const testEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const testAuthToken = await soap.getAccountAuthToken(testEmail);

		// All three messages have double space in subject
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${testEmail}
Subject: How many Linux servers does  Intel IT run in production today?
Date: Mon, 22 Oct 2007 09:00:00 -0700 (PDT)
Message 1 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: other@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does  Intel IT run in production today?
Date: Mon, 22 Oct 2007 10:00:00 -0700 (PDT)
Message 2 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: third@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does  Intel IT run in production today?
Date: Mon, 22 Oct 2007 11:00:00 -0700 (PDT)
Message 3 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(How many Linux servers)</query>
			</SearchRequest>`, testAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		assert.equal(conv.n, '3', 'Conversation should have 3 messages');
	});


	it('Functional | Verify bug 4437 - first message has double space, rest single space (variant 3)', async () => {
		const testEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const testAuthToken = await soap.getAccountAuthToken(testEmail);

		// First message double space, 2nd and 3rd single space
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${testEmail}
Subject: How many Linux servers does  Intel IT run in production today?
Date: Mon, 22 Oct 2007 09:00:00 -0700 (PDT)
Message 1 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: other@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 10:00:00 -0700 (PDT)
Message 2 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: third@example.com
To: ${testEmail}
Subject: Re: How many Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 11:00:00 -0700 (PDT)
Message 3 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(How many Linux servers)</query>
			</SearchRequest>`, testAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		assert.equal(conv.n, '3', 'Conversation should have 3 messages');
	});


	it('Functional | Verify bug 4437 - double spaces in different locations in subject (variant 4)', async () => {
		const testEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const testAuthToken = await soap.getAccountAuthToken(testEmail);

		// Each message has double spaces in different locations
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${testEmail}
Subject: How many  Linux servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 09:00:00 -0700 (PDT)
Message 1 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: other@example.com
To: ${testEmail}
Subject: Re: How many Linux  servers does Intel IT run in production today?
Date: Mon, 22 Oct 2007 10:00:00 -0700 (PDT)
Message 2 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: third@example.com
To: ${testEmail}
Subject: Re: How many Linux servers  does Intel IT run in production today?
Date: Mon, 22 Oct 2007 11:00:00 -0700 (PDT)
Message 3 content
</content>
				</m>
			</AddMsgRequest>`, testAuthToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(How many Linux servers)</query>
			</SearchRequest>`, testAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		assert.equal(conv.n, '3', 'Conversation should have 3 messages');
	});
});
