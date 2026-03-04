import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Purge Messages > Purge Messages Trash', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domainName;
	let purge02Email, purge02Id, purge02MbxId;
	let purge03Email, purge03Id, purge03MbxId;
	let purge04Email, purge04Id, purge04MbxId;
	let senderEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create domain
		domainName = `testpurge${common.getUniqueString()}.com`;
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');

		// Create sender account
		senderEmail = `account1.${common.getUniqueString()}@${domainName}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
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

		// Create purge accounts
		for (const idx of [2, 3, 4]) {
			const email = `purge${idx}.${common.getUniqueString()}@${domainName}`;
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.notExists(res.Fault, `CreateAccountRequest for purge${idx} should not fault`);
			const acct = Array.isArray(res.CreateAccountResponse.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse.account;
			const host2 = acct.a.find(a => a.n === 'zimbraMailHost');
			assert.exists(host2, 'zimbraMailHost should exist');
			if (idx === 2) { purge02Email = email; purge02Id = acct.id; }
			if (idx === 3) { purge03Email = email; purge03Id = acct.id; }
			if (idx === 4) { purge04Email = email; purge04Id = acct.id; }
		}

		// Add messages to purge accounts via AddMsgRequest
		for (const [email, subject] of [[purge02Email, 'purge01a'], [purge03Email, 'purge01a'], [purge03Email, 'purge01c'], [purge04Email, 'purge01a']]) {
			const token = await soap.getAccountAuthToken(email);
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: ${senderEmail}
To: ${email}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain

simple text string in the body</content>
					</m>
				</AddMsgRequest>`, token
			);
		}

		// Get mailbox IDs
		for (const [id, idx] of [[purge02Id, 2], [purge03Id, 3], [purge04Id, 4]]) {
			const mboxRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetMailboxRequest xmlns="urn:zimbraAdmin">
					<mbox id="${id}"/>
				</GetMailboxRequest>`, adminAuthToken
			);
			const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
				? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
			if (idx === 2) purge02MbxId = mbox.mbxid;
			if (idx === 3) purge03MbxId = mbox.mbxid;
			if (idx === 4) purge04MbxId = mbox.mbxid;
		}
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
	it('Functional | Purge messages with zimbraMailPurgeUseChangeDateForTrash true should not purge recently trashed message', async () => {
		// Move message to trash as user
		const token2 = await soap.getAccountAuthToken(purge02Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(purge01a)</query>
			</SearchRequest>`, token2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should exist');

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msg.id}" l="3"/>
			</MsgActionRequest>`, token2
		);

		// Set zimbraMailPurgeUseChangeDateForTrash=TRUE and zimbraMailTrashLifetime=6d
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${purge02Id}</id>
				<a n="zimbraMailMessageLifetime">0</a>
				<a n="zimbraMailTrashLifetime">6d</a>
				<a n="zimbraMailPurgeUseChangeDateForTrash">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Purge
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${purge02Id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');
		const mbox = Array.isArray(purgeRes.PurgeMessagesResponse.mbox)
			? purgeRes.PurgeMessagesResponse.mbox[0] : purgeRes.PurgeMessagesResponse.mbox;
		assert.equal(mbox.mbxid, purge02MbxId, 'Returned mbxid should match');

		// Verify message still exists (was just moved to trash, not old enough)
		const token2b = await soap.getAccountAuthToken(purge02Email);
		const searchAfter = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere subject:(purge01a)</query>
			</SearchRequest>`, token2b
		);
		assert.notExists(searchAfter.Fault, 'SearchRequest should not fault');
		const msgs = searchAfter.SearchResponse?.m;
		assert.exists(msgs, 'Message should still exist after purge (not old enough)');
	});


	it('Functional | Purge messages with zimbraMailPurgeUseChangeDateForTrash false should purge trashed messages after lifetime', async () => {
		// Move messages to trash as user
		const token3 = await soap.getAccountAuthToken(purge03Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(purge01c)</query>
			</SearchRequest>`, token3
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgC = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgC.id}" l="3"/>
			</MsgActionRequest>`, token3
		);

		const searchA = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(purge01a)</query>
			</SearchRequest>`, token3
		);
		const msgA = Array.isArray(searchA.SearchResponse.m)
			? searchA.SearchResponse.m[0] : searchA.SearchResponse.m;

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgA.id}" l="3"/>
			</MsgActionRequest>`, token3
		);

		// Set zimbraMailPurgeUseChangeDateForTrash=FALSE and zimbraMailTrashLifetime=10s
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${purge03Id}</id>
				<a n="zimbraMailPurgeUseChangeDateForTrash">FALSE</a>
				<a n="zimbraMailTrashLifetime">10s</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Wait 10 seconds for trash lifetime to expire
		await soap.waitFor(10000);

		// Purge
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${purge03Id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');
		const mbox = Array.isArray(purgeRes.PurgeMessagesResponse.mbox)
			? purgeRes.PurgeMessagesResponse.mbox[0] : purgeRes.PurgeMessagesResponse.mbox;
		assert.equal(mbox.mbxid, purge03MbxId, 'Returned mbxid should match');

		// Verify messages are purged
		const token3b = await soap.getAccountAuthToken(purge03Email);
		const searchAfter = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere</query>
			</SearchRequest>`, token3b
		);
		assert.notExists(searchAfter.Fault, 'SearchRequest should not fault');
		const msgsAfter = searchAfter.SearchResponse?.m;
		assert.notExists(msgsAfter, 'Messages should be purged from trash');
	});


	it('Functional | Moving message back from trash to inbox before purge should preserve it', async () => {
		// Move message to trash as user
		const token4 = await soap.getAccountAuthToken(purge04Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(purge01a)</query>
			</SearchRequest>`, token4
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;

		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msg.id}" l="3"/>
			</MsgActionRequest>`, token4
		);

		// Wait 10 seconds
		await soap.waitFor(10000);

		// Set zimbraMailPurgeUseChangeDateForTrash=FALSE and zimbraMailTrashLifetime=10s
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${purge04Id}</id>
				<a n="zimbraMailMessageLifetime">0</a>
				<a n="zimbraMailTrashLifetime">10s</a>
				<a n="zimbraMailPurgeUseChangeDateForTrash">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Move message back to inbox
		const token4b = await soap.getAccountAuthToken(purge04Email);
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msg.id}" l="2"/>
			</MsgActionRequest>`, token4b
		);

		// Purge
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${purge04Id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');
		const mbox = Array.isArray(purgeRes.PurgeMessagesResponse.mbox)
			? purgeRes.PurgeMessagesResponse.mbox[0] : purgeRes.PurgeMessagesResponse.mbox;
		assert.equal(mbox.mbxid, purge04MbxId, 'Returned mbxid should match');

		// Verify message still exists in inbox
		const token4c = await soap.getAccountAuthToken(purge04Email);
		const searchAfter = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere subject:(purge01a)</query>
			</SearchRequest>`, token4c
		);
		assert.notExists(searchAfter.Fault, 'SearchRequest should not fault');
		const msgsAfter = searchAfter.SearchResponse?.m;
		assert.exists(msgsAfter, 'Message should still exist after purge (moved back to inbox)');
	});
});
