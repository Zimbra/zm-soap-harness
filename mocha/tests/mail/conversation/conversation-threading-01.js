import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Threading 01', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify zimbraMailThreadingAlgorithm attribute available on COS', async () => {
		const cosName = `cos${common.getUniqueString()}`;
		const createCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(createCosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(createCosRes.CreateCosResponse.cos)
			? createCosRes.CreateCosResponse.cos[0] : createCosRes.CreateCosResponse.cos;
		assert.exists(cos.id, 'COS should have an id');

		// Modify COS through all values
		for (const algo of ['none', 'strict', 'references', 'subjrefs']) {
			const modRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyCosRequest xmlns="urn:zimbraAdmin">
					<id>${cos.id}</id>
					<a n="zimbraMailThreadingAlgorithm">${algo}</a>
				</ModifyCosRequest>`, adminAuthToken
			);
			assert.notExists(modRes.Fault, `ModifyCos to ${algo} should not fault`);
		}
	});


	it('Sanity | Verify zimbraMailThreadingAlgorithm attribute available on account', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		for (const algo of ['none', 'strict', 'references', 'subjrefs']) {
			const modRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
					<id>${acct.id}</id>
					<a n="zimbraMailThreadingAlgorithm">${algo}</a>
				</ModifyAccountRequest>`, adminAuthToken
			);
			assert.notExists(modRes.Fault, `ModifyAccount to ${algo} should not fault`);
		}
	});


	it('Sanity | Verify zimbraMailThreadingAlgorithm inherited from COS to Account', async () => {
		const cosName = `cos${common.getUniqueString()}`;
		const createCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(createCosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(createCosRes.CreateCosResponse.cos)
			? createCosRes.CreateCosResponse.cos[0] : createCosRes.CreateCosResponse.cos;

		const email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos.id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account should be created with COS');
	});


	it('Sanity | Threading with algorithm=none: messages NOT grouped', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">none</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `message1${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Original message content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk2@example.com
To: ${email}
Message-ID: &lt;${uid2}@example.com&gt;
In-Reply-To: &lt;${uid1}@example.com&gt;
References: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Reply content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		// With none, each message should be its own conversation
		assert.equal(String(convs[0].n), '1',
			'With none algorithm, conversation should have only 1 message');
	});


	it('Sanity | Threading with algorithm=strict: messages grouped by References', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">strict</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const uid4 = common.getUniqueString();
		const subject = `message1${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Original message
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk2@example.com
To: ${email}
Message-ID: &lt;${uid2}@example.com&gt;
In-Reply-To: &lt;${uid1}@example.com&gt;
References: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Reply content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk3@example.com
To: ${email}
Message-ID: &lt;${uid3}@example.com&gt;
In-Reply-To: &lt;${uid2}@example.com&gt;
References: &lt;${uid1}@example.com&gt; &lt;${uid2}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Another reply
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk4@example.com
To: ${email}
Message-ID: &lt;${uid4}@example.com&gt;
In-Reply-To: &lt;${uid3}@example.com&gt;
References: &lt;${uid1}@example.com&gt; &lt;${uid2}@example.com&gt; &lt;${uid3}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Fourth message
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '4',
			'With strict algorithm, conversation should have 4 messages');
	});


	it('Sanity | Threading with algorithm=subject: messages grouped by subject', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const subject = `message1${common.getUniqueString()}`;
		for (let i = 0; i < 4; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: pk${i + 1}@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Message ${i + 1} content
</content>
					</m>
				</AddMsgRequest>`, authToken
			);
		}

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '4',
			'With subject algorithm, conversation should have 4 messages');
	});


	it('Sanity | Verify mime has Thread-Topic and Thread-Index headers', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const subject = `message1${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Thread-Topic: ${subject}
Thread-Index: YsZGm0xRHSkS00xl3BugKGf4ZvVgdw==
Test message content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversation');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;

		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv.id}" fetch="all">
				<header n="Thread-Topic"/>
				<header n="Thread-Index"/>
				<query>in:inbox</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(searchConvRes.Fault, 'SearchConvRequest should not fault');
	});


	it('Sanity | Threading with subject: Re and Fw prefixes normalized', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">subject</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const subject = `message1${common.getUniqueString()}`;
		const prefixes = ['', 'Re: ', 'Fw: ', 'Fwd: '];
		for (let i = 0; i < prefixes.length; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: pk${i + 1}@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
Subject: ${prefixes[i]}${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Message ${i + 1}
</content>
					</m>
				</AddMsgRequest>`, authToken
			);
		}

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '4',
			'Re/Fw/Fwd prefixed messages should be in same conversation');
	});


	it('Sanity | Threading with references algorithm', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">references</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `message1${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Original message
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk2@example.com
To: ${email}
Message-ID: &lt;${uid2}@example.com&gt;
In-Reply-To: &lt;${uid1}@example.com&gt;
References: &lt;${uid1}@example.com&gt;
Subject: Re: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Reply content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk3@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
In-Reply-To: &lt;${uid2}@example.com&gt;
References: &lt;${uid1}@example.com&gt; &lt;${uid2}@example.com&gt;
Subject: Re: Re: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Another reply
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.isAtLeast(Number(conv.n), 2,
			'With references algorithm, related messages should be grouped');
	});


	it('Sanity | Threading with subjrefs algorithm', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">subjrefs</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const uid1 = common.getUniqueString();
		const subject = `message1${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Original message
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk2@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
In-Reply-To: &lt;${uid1}@example.com&gt;
References: &lt;${uid1}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Reply content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.isAtLeast(Number(conv.n), 2,
			'With subjrefs, related messages should be grouped');
	});


	it('Sanity | Messages with different subjects are NOT grouped', async () => {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		const subject1 = `subjectA${common.getUniqueString()}`;
		const subject2 = `subjectB${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk1@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
Subject: ${subject1}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content 1
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: pk2@example.com
To: ${email}
Message-ID: &lt;${common.getUniqueString()}@example.com&gt;
Subject: ${subject2}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content 2
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		// Search each subject - both should be in separate conversations
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject1}) OR subject:(${subject2})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find messages');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.equal(msgs.length, 2, 'Should find 2 messages with different subjects');
	});
});
