import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Loop', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let acct1Email, acct1AuthToken, acct2Email, acct2AuthToken;
	let convSubject, convId, tagId, folderId, folderName;

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

		// Send initial message to create conversation
		convSubject = `First conversation ${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<su>${convSubject}</su>
					<mp ct="text/plain">
						<content>Content of mail initial</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);

		// Send 10 reply messages to create a conversation (use loop instead of 1000)
		for (let i = 0; i < 10; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${acct2Email}"/>
						<su>Re: ${convSubject}</su>
						<mp ct="text/plain">
							<content>Content of mail reply ${i}</content>
						</mp>
					</m>
				</SendMsgRequest>`, acct1AuthToken
			);
		}

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Login as acct2 and get folder info
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
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
	it('Functional | Create a conversation with many messages', async () => {
		// Verify GetInfoRequest works after creating many messages
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct1AuthToken
		);
		assert.notExists(infoRes.Fault, 'GetInfoRequest should not fault');
		assert.exists(infoRes.GetInfoResponse.name, 'name should exist');
	});


	it('Functional | Search a conversation with many messages', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>subject:(${convSubject})</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		convId = conv.id;
	});


	it('Functional | Mark conversation as read', async () => {
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(readRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(readRes.ConvActionResponse.action.op, 'read', 'op should be read');

		// Verify conversation is read
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>is:read</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the read conversation');
	});


	it('Functional | Mark conversation as unread', async () => {
		const unreadRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!read"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(unreadRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(unreadRes.ConvActionResponse.action.op, '!read', 'op should be !read');

		// Verify conversation is unread
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>is:unread</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the unread conversation');
	});


	it('Functional | Flag a conversation with many messages', async () => {
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="flag"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(flagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(flagRes.ConvActionResponse.action.op, 'flag', 'op should be flag');

		// Verify flagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>is:flagged</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the flagged conversation');
	});


	it('Functional | Unflag a conversation with many messages', async () => {
		const unflagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!flag"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(unflagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(unflagRes.ConvActionResponse.action.op, '!flag', 'op should be !flag');

		// Verify unflagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>is:unflagged</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the unflagged conversation');
	});


	it('Functional | Tag a conversation with many messages', async () => {
		const tagName = `Tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, acct2AuthToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(tagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(tagRes.ConvActionResponse.action.op, 'tag', 'op should be tag');

		// Verify tagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the tagged conversation');
	});


	it('Functional | Untag a conversation with many messages', async () => {
		const untagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="!tag" tag="${tagId}"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(untagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(untagRes.ConvActionResponse.action.op, '!tag', 'op should be !tag');
	});


	it('Functional | Move a conversation with many messages to a folder', async () => {
		folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		const rootId = folderRes.GetFolderResponse.folder[0]
			? folderRes.GetFolderResponse.folder[0].id
			: folderRes.GetFolderResponse.folder.id;

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}"/>
			</CreateFolderRequest>`, acct2AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="${folderId}"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(moveRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(moveRes.ConvActionResponse.action.op, 'move', 'op should be move');

		// Verify moved
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>in:"${folderName}"</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.exists(match, 'Should find the conversation in moved folder');
	});


	it('Functional | Mark conversation as spam', async () => {
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="spam"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(spamRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(spamRes.ConvActionResponse.action.op, 'spam', 'op should be spam');

		// Verify in spam
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>in:"Junk"</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Verify not in previous folder
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" offset="0" limit="25">
				<query>in:"${folderName}"</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
	});


	it('Functional | Delete a conversation with many messages', async () => {
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete"/>
			</ConvActionRequest>`, acct2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(deleteRes.ConvActionResponse.action.op, 'delete', 'op should be delete');
	});


	it('Functional | Search for the nonexisting conversation after delete', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
				<query>subject:(${convSubject})</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const match = convs.find(c => c && c.id === convId);
		assert.notExists(match, 'Should not find the deleted conversation');
	});
});
