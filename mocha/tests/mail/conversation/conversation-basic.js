import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Basic', function () {
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

	// Tests
	it('Smoke | Verify bug 59', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add messages to create a conversation with participants
		const subject = `Conversation${common.getUniqueString()}`;
		const participant1 = 'first1.last1@foo.com';
		const participant3 = 'first3.last3@foo.com';

		// Inject message 1 from participant1
		const mime1 = `From: ${participant1}
To: ${accountEmail}
Subject: ${subject}
Date: Mon, 1 Jan 2024 10:00:00 -0000
Message-ID: &lt;msg1-${common.getUniqueString()}@foo.com&gt;
First message in conversation
`;
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>${mime1}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMsgRequest 1 should not fault');

		// Inject message 2 with missing From header (participant2 has no From)
		const mime2 = `To: ${accountEmail}
Subject: Re: ${subject}
Date: Mon, 1 Jan 2024 10:01:00 -0000
Message-ID: &lt;msg2-${common.getUniqueString()}@foo.com&gt;
Second message missing From header
`;
		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>${mime2}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMsgRequest 2 should not fault');

		// Inject message 3 from participant3
		const mime3 = `From: ${participant3}
To: ${accountEmail}
Subject: Re: ${subject}
Date: Mon, 1 Jan 2024 10:02:00 -0000
Message-ID: &lt;msg3-${common.getUniqueString()}@foo.com&gt;
Third message in conversation
`;
		const addRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>${mime3}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes3.Fault, 'AddMsgRequest 3 should not fault');

		// Search for conversation and verify participants

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');

		// Verify participant1 and participant3 are present
		const emailNodes = Array.isArray(conv.e) ? conv.e : [conv.e];
		const hasParticipant1 = emailNodes.some(e => e && e.a === participant1);
		const hasParticipant3 = emailNodes.some(e => e && e.a === participant3);
		assert.isTrue(hasParticipant1, 'Participant1 should be in conversation');
		assert.isTrue(hasParticipant3, 'Participant3 should be in conversation');
	});


	it('Functional | Verify bug 2288 - bad conversation ID when sending a message to yourself', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to yourself
		const subject = `Subject${common.getUniqueString()}`;
		const content = `Content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for the messages
		await new Promise(resolve => setTimeout(resolve, 3000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Verify conv IDs are not 0
		const inboxMsg = msgs.find(m => m && m.l === '2');
		if (inboxMsg) {
			assert.notEqual(inboxMsg.cid, '0', 'Conversation ID should not be 0 for inbox message');
		}

		const sentMsg = msgs.find(m => m && m.l === '5');
		assert.exists(sentMsg, 'Should find message in sent');
		assert.notEqual(sentMsg.cid, '0', 'Conversation ID should not be 0 for sent message');

		// Save the conversation ID
		const conversationId = inboxMsg ? inboxMsg.cid : sentMsg.cid;

		// Search for conversation and verify IDs are not 0
		const convSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(convSearchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(convSearchRes.SearchResponse.c)
			? convSearchRes.SearchResponse.c[0] : convSearchRes.SearchResponse.c;
		assert.exists(conv, 'Should find the conversation');
		assert.notEqual(String(conv.id), '0', 'Conversation ID should not be 0');
	});


	it('Functional | Verify bug 6023 - IMAP Copy null pointer exception', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Send 3 messages to create a conversation
		const subject = `Subject${common.getUniqueString()}`;
		const content = `Content${common.getUniqueString()}`;

		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${soap.testAccounts.testAccount1.emailAddress}"/>
					<su>RE: ${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest 1 should not fault');
		const msg1 = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0] : sendRes1.SendMsgResponse.m;
		const message1Id = msg1.id;

		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${soap.testAccounts.testAccount1.emailAddress}"/>
					<su>RE: ${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes2.Fault, 'SendMsgRequest 2 should not fault');
		const msg2 = Array.isArray(sendRes2.SendMsgResponse.m)
			? sendRes2.SendMsgResponse.m[0] : sendRes2.SendMsgResponse.m;
		const message2Id = msg2.id;

		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${soap.testAccounts.testAccount1.emailAddress}"/>
					<su>RE: ${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes3.Fault, 'SendMsgRequest 3 should not fault');
		const msg3 = Array.isArray(sendRes3.SendMsgResponse.m)
			? sendRes3.SendMsgResponse.m[0] : sendRes3.SendMsgResponse.m;
		const message3Id = msg3.id;

		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Create two subfolders under inbox
		const folderName2 = `folder${common.getUniqueString()}`;
		const folderName3 = `folder${common.getUniqueString()}`;

		const inboxFolderId = '2';
		const createFolder2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName2}" l="${inboxFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createFolder2Res.Fault, 'CreateFolderRequest should not fault');
		const folder2 = Array.isArray(createFolder2Res.CreateFolderResponse.folder)
			? createFolder2Res.CreateFolderResponse.folder[0]
			: createFolder2Res.CreateFolderResponse.folder;
		const folder2Id = folder2.id;

		const createFolder3Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName3}" l="${inboxFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createFolder3Res.Fault, 'CreateFolderRequest should not fault');
		const folder3 = Array.isArray(createFolder3Res.CreateFolderResponse.folder)
			? createFolder3Res.CreateFolderResponse.folder[0]
			: createFolder3Res.CreateFolderResponse.folder;
		const folder3Id = folder3.id;

		// Move message2 to folder2, message3 to folder3
		const moveRes2 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message2Id}" op="move" l="${folder2Id}"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes2.Fault, 'MsgActionRequest should not fault');

		const moveRes3 = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message3Id}" op="move" l="${folder3Id}"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes3.Fault, 'MsgActionRequest should not fault');

		// Delete folder2 (hard delete)
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folder2Id}"/>
			</ItemActionRequest>`, accountAuthToken
		);
		assert.notExists(deleteRes.Fault, 'ItemActionRequest should not fault');

		// Search for messages by subject
		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchMsgRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchMsgRes.SearchResponse, 'SearchResponse should exist');

		// Get message1 to verify no null pointer exception
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${message1Id}" read="1" html="1"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		// Search for conversation to verify no crash
		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchConvRes.Fault, 'SearchRequest for conversation should not fault');
		assert.exists(searchConvRes.SearchResponse, 'SearchResponse should exist');
	});
});
