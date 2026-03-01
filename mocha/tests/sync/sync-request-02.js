import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Sync Request 02', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null;
	let inboxId = null, trashId = null, sentId = null, draftsId = null, junkId = null;

	before(async function () {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		await soap.getAccountAuthToken(account2Email);

		// Get standard folder ids
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		inboxId = folders[0].folder.find(f => f.name === 'Inbox').id;
		trashId = folders[0].folder.find(f => f.name === 'Trash').id;
		sentId = folders[0].folder.find(f => f.name === 'Sent').id;
		draftsId = folders[0].folder.find(f => f.name === 'Drafts').id;
		junkId = folders[0].folder.find(f => f.name === 'Junk').id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Helper: get sync token
	async function getSyncToken(authToken) {
		// SyncRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse.token;
	}

	// Helper: sync with token
	async function syncWithToken(token, authToken) {
		// SyncRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token}"/>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.SyncResponse;
	}

	// Tests
	it('Functional | SyncRequest after moving a contact to sent folder', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${sentId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Contact moved to sent should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to drafts', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${draftsId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Contact moved to drafts should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a contact to junk folder', async () => {
		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);
		const contactId = createRes.CreateContactResponse.cn[0].id;
		const token = await getSyncToken(accountAuthToken);

		// ContactActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${junkId}"/>
			</ContactActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);
		const match = syncCns.find(c => c.id === contactId);

		// Verify response
		assert.exists(match, 'Contact moved to junk should appear in SyncResponse');
	});


	// Tests - Mail operations
	it('Functional | SyncRequest after tagging and untagging a mail from inbox', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		let searchMsgs = [];
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 1500));

			// SearchRequest
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, accountAuthToken
			);

			// Verify response
			assert.notExists(searchRes.Fault, 'Search should not be a Fault');
			searchMsgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
			if (searchMsgs.length > 0) break;
		}
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTag = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tagId = createTag.CreateTagResponse.tag[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${msgId}" tag="${tagId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs1 = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs1.find(m => m.id === msgId),
			'Tagged message should appear in SyncResponse');

		const token2 = syncData.token;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!tag" id="${msgId}" tag="${tagId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		const syncMsgs2 = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs2.find(m => m.id === msgId),
			'Untagged message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking the mail as flagged and unflagged', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		let searchMsgs = [];
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 1500));

			// SearchRequest
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, accountAuthToken
			);

			// Verify response
			assert.notExists(searchRes.Fault, 'Search should not be a Fault');
			searchMsgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
			if (searchMsgs.length > 0) break;
		}
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		let syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Flagged message should appear in SyncResponse');

		const token2 = syncData.token;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!flag" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Unflagged message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking the mail as read and unread', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		let searchMsgs = [];
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 1500));

			// SearchRequest
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, accountAuthToken
			);

			// Verify response
			assert.notExists(searchRes.Fault, 'Search should not be a Fault');
			searchMsgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
			if (searchMsgs.length > 0) break;
		}
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		let syncData = await syncWithToken(token, accountAuthToken);
		let syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Read message should appear in SyncResponse');

		const token2 = syncData.token;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!read" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		syncData = await syncWithToken(token2, accountAuthToken);
		syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Unread message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to trash', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		let searchMsgs = [];
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 1500));

			// SearchRequest
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, accountAuthToken
			);

			// Verify response
			assert.notExists(searchRes.Fault, 'Search should not be a Fault');
			searchMsgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
			if (searchMsgs.length > 0) break;
		}
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to trash should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to spam folder', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${junkId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to spam should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to drafts', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${draftsId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to drafts should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to sent folder', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${sentId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to sent should appear in SyncResponse');
	});


	it('Functional | SyncRequest after moving a mail to inbox folder', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Move to trash first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${trashId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Move back to inbox
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${inboxId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Mail moved to inbox should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking a mail as spam', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		const token = await getSyncToken(accountAuthToken);

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Spam-marked message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking it as not a spam 1', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Mark as spam first
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Mark as not spam
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Not-spam message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after marking it as not a spam 2', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test</content></mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const searchMsgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(searchMsgs.length, 0, 'Should find the sent message');
		const msgId = searchMsgs[0].id;

		// Move to junk/spam
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${msgId}" l="${junkId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const token = await getSyncToken(accountAuthToken);

		// Mark as not spam (moves back to inbox)
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="!spam" id="${msgId}"/>
			</MsgActionRequest>`, accountAuthToken
		);

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Not-spam (variant 2) message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after addition of mail', async () => {
		const token = await getSyncToken(accountAuthToken);

		// AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Subject: hello${common.getUniqueString()}

Content Text
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Added message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after saving the mail as draft', async () => {
		const token = await getSyncToken(accountAuthToken);

		// SaveDraftRequest
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>Draft mail ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Draft content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(draftRes.Fault, 'Response should not be a Fault');
		const draftId = draftRes.SaveDraftResponse.m[0].id;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === draftId),
			'Draft message should appear in SyncResponse');
	});


	it('Functional | SyncRequest after creating an appointment', async () => {
		const token = await getSyncToken(accountAuthToken);

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="Meeting${common.getUniqueString()}" loc="India">
						<s d="${new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
						<e d="${new Date(Date.now() + 7200000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Meeting content</content>
					</mp>
					<su>Test appointment ${common.getUniqueString()}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');
		const apptId = apptRes.CreateAppointmentResponse.calItemId;

		const syncData = await syncWithToken(token, accountAuthToken);
		const syncAppts = Array.isArray(syncData.appt)
			? syncData.appt : (syncData.appt ? [syncData.appt] : []);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		const found = syncAppts.find(a => a.id === apptId)
			|| syncMsgs.find(m => m.id === apptId);

		// Verify response
		assert.exists(found,
			'Created appointment should appear in SyncResponse');
	});


	it('Functional | SyncRequest with previous token instead of current token', async () => {
		// Step 1: Get token A
		const tokenA = await getSyncToken(accountAuthToken);

		// Step 2: Add a message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Subject: tokenTest${common.getUniqueString()}

Content Text
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Step 3: Sync with token A to get token B
		const syncB = await syncWithToken(tokenA, accountAuthToken);

		// Verify response
		assert.exists(syncB.token, 'Should get a new token B');

		// Step 4: Add a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'Response should not be a Fault');
		const contactId = contactRes.CreateContactResponse.cn[0].id;

		// Step 5: Sync with token A (should show both message and contact)
		const syncData = await syncWithToken(tokenA, accountAuthToken);
		const syncMsgs = Array.isArray(syncData.m)
			? syncData.m : (syncData.m ? [syncData.m] : []);
		const syncCns = Array.isArray(syncData.cn)
			? syncData.cn : (syncData.cn ? [syncData.cn] : []);

		// Verify response
		assert.exists(syncMsgs.find(m => m.id === msgId),
			'Message should appear when syncing with old token A');
		assert.exists(syncCns.find(c => c.id === contactId),
			'Contact should appear when syncing with old token A');
	});


	it('Regression | SyncRequest with the invalid numeric tokens (Negative, Zero, Decimal, Large Number)', async () => {
		// Negative token
		const negRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="-1" xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(negRes.Fault, 'Negative token should not cause a Fault');
		assert.exists(negRes.SyncResponse.token, 'Should return a valid token');

		// Zero token
		const zeroRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="0" xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(zeroRes.Fault, 'Zero token should not cause a Fault');
		assert.exists(zeroRes.SyncResponse.token, 'Should return a valid token');

		// Decimal token — should return INVALID_REQUEST
		const decRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="1.54" xmlns="urn:zimbraMail"/>', accountAuthToken, false
		);

		// Verify response
		assert.exists(decRes.Fault, 'Decimal token should return Fault');
		assert.include(decRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Large number token
		const largeRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="111222333" xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(largeRes.Fault, 'Large number token should not cause a Fault');
		assert.exists(largeRes.SyncResponse.token, 'Should return a valid token');
	});


	it('Regression | SyncRequest with the invalid tokens (blank, spaces, sometext)', async () => {
		// Blank token — server treats as no-token sync (returns full SyncResponse)
		const blankRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="" xmlns="urn:zimbraMail"/>', accountAuthToken, false
		);
		if (blankRes.Fault) {

			// Verify response
			assert.include(blankRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Error code should be service.INVALID_REQUEST');
		} else {
			assert.exists(blankRes.SyncResponse, 'Blank token should return a valid SyncResponse');
		}

		// Spaces token
		const spaceRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="        " xmlns="urn:zimbraMail"/>', accountAuthToken, false
		);

		// Verify response
		assert.exists(spaceRes.Fault, 'Spaces token should return Fault');
		assert.include(spaceRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Sometext token
		const textRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest token="Some Text" xmlns="urn:zimbraMail"/>', accountAuthToken, false
		);

		// Verify response
		assert.exists(textRes.Fault, 'Text token should return Fault');
		assert.include(textRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});
});
