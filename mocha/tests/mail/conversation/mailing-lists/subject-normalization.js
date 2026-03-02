import path from 'node:path';
import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Conversation > Mailing Lists > Subject Normalization', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
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
	it('Functional | Exclude mailing list prefixes during subject normalization', async () => {
		// Create test account
		const accountEmail = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		const subject = `subject${common.getUniqueString()}`;
		const content1 = `content${common.getUniqueString()}`;
		const content2 = `content${common.getUniqueString()}`;
		const content3 = `content${common.getUniqueString()}`;
		const content4 = `content${common.getUniqueString()}`;

		// AddMsgRequest 1: [mailing-list] subject
		const addMsg1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: [mailing-list] ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content1}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg1.Fault, 'AddMsgRequest 1 should not fault');
		const msg1 = Array.isArray(addMsg1.AddMsgResponse.m)
			? addMsg1.AddMsgResponse.m[0] : addMsg1.AddMsgResponse.m;

		// AddMsgRequest 2: RE: [mailing-list] subject
		const addMsg2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: RE: [mailing-list] ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content2}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg2.Fault, 'AddMsgRequest 2 should not fault');
		const msg2 = Array.isArray(addMsg2.AddMsgResponse.m)
			? addMsg2.AddMsgResponse.m[0] : addMsg2.AddMsgResponse.m;

		// AddMsgRequest 3: FWD: [mailing-list] subject
		const addMsg3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: FWD: [mailing-list] ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content3}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg3.Fault, 'AddMsgRequest 3 should not fault');
		const msg3 = Array.isArray(addMsg3.AddMsgResponse.m)
			? addMsg3.AddMsgResponse.m[0] : addMsg3.AddMsgResponse.m;

		// AddMsgRequest 4: FWD: [mailing-list] RE: subject
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: FWD: [mailing-list] RE: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content4}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);

		// Search for conversation by subject
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find a conversation');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;

		// GetConvRequest and verify all messages are in the same conversation
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${conv.id}"/>
			</GetConvRequest>`, authToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const convData = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		const convMsgs = Array.isArray(convData.m) ? convData.m : [convData.m];
		const msg1InConv = convMsgs.find(m => String(m.id) === String(msg1.id));
		assert.exists(msg1InConv, 'Message 1 should be in the conversation');
		const msg2InConv = convMsgs.find(m => String(m.id) === String(msg2.id));
		assert.exists(msg2InConv, 'Message 2 should be in the conversation');
		const msg3InConv = convMsgs.find(m => String(m.id) === String(msg3.id));
		assert.exists(msg3InConv, 'Message 3 should be in the conversation');
	});


	it('Functional | Verify the mailing list brackets are not included in the sort order by subject', async () => {
		// Create test account
		const accountEmail = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		const content = `content${common.getUniqueString()}`;

		// Add 4 messages with different subjects to test sort order
		// Subject "b"
		const addMsg1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: bar@example.com
Subject: b
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg1.Fault, 'AddMsg b should not fault');
		const msgB = Array.isArray(addMsg1.AddMsgResponse.m)
			? addMsg1.AddMsgResponse.m[0] : addMsg1.AddMsgResponse.m;

		// Subject "d"
		const addMsg2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: d
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg2.Fault, 'AddMsg d should not fault');
		const msgD = Array.isArray(addMsg2.AddMsgResponse.m)
			? addMsg2.AddMsgResponse.m[0] : addMsg2.AddMsgResponse.m;

		// Subject "[cmailing-list] a"
		const addMsg3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: [cmailing-list] a
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg3.Fault, 'AddMsg [cmailing-list] a should not fault');
		const msgA = Array.isArray(addMsg3.AddMsgResponse.m)
			? addMsg3.AddMsgResponse.m[0] : addMsg3.AddMsgResponse.m;

		// Subject "[amailing-list] c"
		const addMsg4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@example.com
To: mailinglist@example.com
Subject: [amailing-list] c
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
${content}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsg4.Fault, 'AddMsg [amailing-list] c should not fault');
		const msgC = Array.isArray(addMsg4.AddMsgResponse.m)
			? addMsg4.AddMsgResponse.m[0] : addMsg4.AddMsgResponse.m;

		// Search sorted by subject ascending
		await new Promise(resolve => setTimeout(resolve, 2000));

		let searchRes;
		let retries = 3;
		while (retries > 0) {
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" sortBy="subjAsc" types="message">
					<query>content:(${content})</query>
				</SearchRequest>`, authToken
			);
const m = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			if (m.length >= 4) break;
			retries--;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find messages');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Verify sort order: a, b, c, d (brackets not included in sort)
		assert.equal(String(msgs[0].id), String(msgA.id), 'First message should be "a"');
		assert.equal(String(msgs[1].id), String(msgB.id), 'Second message should be "b"');
		assert.equal(String(msgs[2].id), String(msgC.id), 'Third message should be "c"');
		assert.equal(String(msgs[3].id), String(msgD.id), 'Fourth message should be "d"');
	});


	it('Functional | Verify two messages with the same message ID are combined into the same conversation', async () => {
		// Create test account
		const accountEmail = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject first MIME (subject: email01A)
		const filePath1 = path.join(config.projectRoot, 'mocha/data/email40/msg01.txt');
		await soap.injectMime(authToken, filePath1);

		// Inject second MIME (subject: [mailing-list] email01A, same Message-ID)
		const filePath2 = path.join(config.projectRoot, 'mocha/data/email40/msg02.txt');
		await soap.injectMime(authToken, filePath2);

		// Wait for LMTP delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Search for first message by content
		let searchRes1;
		let retries1 = 3;
		while (retries1 > 0) {
			searchRes1 = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>content:content1</query>
				</SearchRequest>`, authToken
			);
			retries1--;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		assert.notExists(searchRes1.Fault, 'SearchRequest 1 should not fault');
		const msg1 = Array.isArray(searchRes1.SearchResponse.m)
			? searchRes1.SearchResponse.m[0] : searchRes1.SearchResponse.m;
		assert.exists(msg1, 'First message should be found');
		const cid1 = msg1.cid;

		// Search for second message by content
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:content2</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest 2 should not fault');
		const msg2 = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m[0] : searchRes2.SearchResponse.m;
		assert.exists(msg2, 'Second message should be found');

		// Verify both messages are in the same conversation
		assert.equal(String(msg2.cid), String(cid1),
			'Both messages should be in the same conversation');
	});
});
