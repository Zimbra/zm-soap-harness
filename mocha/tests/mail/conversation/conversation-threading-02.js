import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Threading 02', function () {
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

	/**
	 * Helper: inject 3 messages with specific threading headers.
	 * @param {string} authToken - user auth token
	 * @param {string} email - user email
	 * @param {string} algo - threading algorithm
	 * @param {boolean} sameSubject - whether all msgs share a subject
	 * @param {string} refsMode - 'mapped'|'unmapped'|'none'
	 * @returns {Promise<void>}
	 */
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

	async function addMsgWithHeaders(authToken, email, opts) {
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


	// Test 1: strict + same subject + unmapped references
	// Messages have In-Reply-To pointing to msg1 but References pointing elsewhere
	// With strict, In-Reply-To is used, so messages should be grouped
	it('Sanity | Strict: same subject, unmapped references - grouped by In-Reply-To', async () => {
		const { email, authToken } = await setupAccountWithAlgo('strict');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_message1${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1,
			references: [`unmapped${common.getUniqueString()}`]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject, inReplyTo: uid2,
			references: [`unmapped${common.getUniqueString()}`]
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
			'With strict algo and In-Reply-To, all 3 should be grouped');
	});


	// Test 2: none + same subject + has references
	// With none, nothing should be grouped
	it('Sanity | None: same subject, with references - NOT grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('none');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_message1${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1, references: [uid1]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject, inReplyTo: uid2, references: [uid1, uid2]
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
			'With none algo, messages should NOT be grouped');
	});


	// Test 3: references + same subject + has references
	// With references algo, messages with matching References should be grouped
	it('Sanity | References: same subject, with references - grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('references');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_message1${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2, subject, inReplyTo: uid1, references: [uid1]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject, inReplyTo: uid2, references: [uid1, uid2]
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
			'With references algo, messages should be grouped');
	});


	// Test 4: subject + same subject + different references
	// With subject algo, same subject = grouped regardless of references
	it('Sanity | Subject: same subject, different references - grouped by subject', async () => {
		const { email, authToken } = await setupAccountWithAlgo('subject');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subject = `same_message1${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2, subject, inReplyTo: null,
			references: [`unrelated${common.getUniqueString()}`]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject, inReplyTo: null,
			references: [`unrelated${common.getUniqueString()}`]
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
			'With subject algo, same subject should be grouped');
	});


	// Test 5: strict + diff subject + connected references
	// With strict, references matter, not subject
	it('Sanity | Strict: different subjects, connected references - grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('strict');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subj3 = `diff3_message${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1,
			subject: `diff1_message${common.getUniqueString()}`,
			inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2,
			subject: `diff2_message${common.getUniqueString()}`,
			inReplyTo: uid1, references: [uid1]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject: subj3,
			inReplyTo: uid2, references: [uid1, uid2]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subj3})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '3',
			'With strict algo, references should group even with diff subjects');
	});


	// Test 6: none + diff subject + diff references
	// With none, nothing grouped
	it('Sanity | None: different subjects, different references - NOT grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('none');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subj3 = `diff3_message${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1,
			subject: `diff1_message${common.getUniqueString()}`,
			inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2,
			subject: `diff2_message${common.getUniqueString()}`,
			inReplyTo: uid1, references: [uid1]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject: subj3,
			inReplyTo: uid2, references: [uid1, uid2]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subj3})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '1',
			'With none algo, messages should NOT be grouped');
	});


	// Test 7: references + diff subject + connected references
	// With references, connected references = grouped despite diff subjects
	it('Sanity | References: different subjects, connected refs - grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('references');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const uid3 = common.getUniqueString();
		const subj3 = `diff3_message${common.getUniqueString()}`;

		await addMsgWithHeaders(authToken, email, {
			msgId: uid1,
			subject: `diff1_message${common.getUniqueString()}`,
			inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid2,
			subject: `diff2_message${common.getUniqueString()}`,
			inReplyTo: uid1, references: [uid1]
		});
		await addMsgWithHeaders(authToken, email, {
			msgId: uid3, subject: subj3,
			inReplyTo: uid2, references: [uid1, uid2]
		});

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${subj3})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(String(conv.n), '3',
			'With references algo, connected refs should group');
	});


	// Test 8: strict + same subject + NO In-Reply-To/References headers
	// With strict, no references = not grouped
	it('Sanity | Strict: same subject, no In-Reply-To or References - NOT grouped', async () => {
		const { email, authToken } = await setupAccountWithAlgo('strict');
		const uid1 = common.getUniqueString();
		const uid2 = common.getUniqueString();
		const subject = `same_message${common.getUniqueString()}`;
		await addMsgWithHeaders(authToken, email, {
			msgId: uid1, subject, inReplyTo: null, references: null
		});
		await addMsgWithHeaders(authToken, email, {
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
			'With strict and no refs, same subject should NOT be grouped');
	});
});
