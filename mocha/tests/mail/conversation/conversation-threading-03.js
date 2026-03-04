import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Threading 03', function () {
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

	async function setupAccountWithAlgo(algo) {
		const email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailThreadingAlgorithm">${algo}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const authToken = await soap.getAccountAuthToken(email);
		return { email, authToken };
	}

	async function addMsg(authToken, email, opts) {
		const { msgId, subject, inReplyTo, references } = opts;
		let headers = `From: sender@example.com
To: ${email}
Message-ID: &lt;${msgId}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8`;
		if (inReplyTo) {
			headers += `\nIn-Reply-To: &lt;${inReplyTo}@example.com&gt;`;
		}
		if (references) {
			const refStr = references
				.map(r => `&lt;${r}@example.com&gt;`).join(' ');
			headers += `\nReferences: ${refStr}`;
		}
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>${headers}
Message content
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(res.Fault, 'AddMsgRequest should not fault');
	}


	// Test 1: subjrefs + same subject + matching references - grouped
	it('Sanity | Subjrefs: same subject, matching references - grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subjrefs');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1, references: [uid1]
		});
		await addMsg(authToken, email, {
			msgId: uid3, subject, inReplyTo: uid2,
			references: [uid1, uid2]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '3',
			'Subjrefs: same subject + refs should group all 3');
	});


	// Test 2: subjrefs + same subject + no references - grouped by subject
	it('Sanity | Subjrefs: same subject, no references - grouped by subject', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subjrefs');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid3, subject, inReplyTo: uid2, references: null
		});

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
			'Subjrefs: same subject + In-Reply-To should group');
	});


	// Test 3: subjrefs + same subject + matching In-Reply-To from diff senders
	it('Sanity | Subjrefs: same subject, matching In-Reply-To from diff senders', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subjrefs');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject,
			inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject,
			inReplyTo: uid1, references: [uid1]
		});
		await addMsg(authToken, email, {
			msgId: uid3, subject,
			inReplyTo: uid2, references: [uid1, uid2]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '3',
			'Subjrefs: same subject + In-Reply-To should group all 3');
	});


	// Test 4: subjrefs + different subjects + NO references
	it('Sanity | Subjrefs: different subjects, no references - NOT grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subjrefs');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subj2 = `diff2_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1,
			subject: `diff1_msg${common.getUniqueString()}`,
			inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject: subj2,
			inReplyTo: null, references: null
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subj2})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '1',
			'Subjrefs: diff subjects + no refs should NOT group');
	});


	// Test 5: strict + same subject + different In-Reply-To header
	it('Sanity | Strict: same subject, different In-Reply-To - NOT grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('strict');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		// In-Reply-To points to a non-existent message
		await addMsg(authToken, email, {
			msgId: uid2, subject,
			inReplyTo: `nonexistent${common.getUniqueString()}`,
			references: [`nonexistent${common.getUniqueString()}`]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.equal(String(convs[0].n), '1',
			'Strict: unrelated In-Reply-To should NOT group');
	});


	// Test 6: subject + same subject + no In-Reply-To
	it('Sanity | Subject: same subject, no In-Reply-To - grouped by subject', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subject');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid3, subject, inReplyTo: null, references: null
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '3',
			'Subject: same subject should group even without refs');
	});


	// Test 7: references + same subject + no In-Reply-To or References
	it('Sanity | References: same subject, no refs - NOT grouped by references', async () => {
		const { email, authToken } = await setupAccountWithAlgo('references');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject, inReplyTo: null, references: null
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.equal(String(convs[0].n), '1',
			'References: same subject without refs should NOT group');
	});


	// Test 8: subjrefs + same subject + matching In-Reply-To only (no References)
	it('Sanity | Subjrefs: same subject, In-Reply-To only - grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subjrefs');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `same_msg${common.getUniqueString()}`;

		await addMsg(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsg(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1, references: null
		});

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
			'Subjrefs: same subject + In-Reply-To should group');
	});
});
