import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Dumpster > Bug 61989', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();
	const composeSubject = 'Subject of the message is testing dumpster';
	const composeContent = 'Content in the message is contents dumpstertest';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Name = `dumpster61989.${uid}a@${config.testDomain}`;
		account2Name = `dumpster61989.${uid}b@${config.testDomain}`;

		// Create accounts with dumpster enabled
		for (const name of [account1Name, account2Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
					<a n="zimbraDumpsterEnabled">TRUE</a>
				</CreateAccountRequest>`, adminAuthToken
			);
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
	it('Sanity | Verify that recovered message from dumpsrer is searchable by subject or content', async () => {
		// Login as account1 and send message to account2
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>${composeSubject}</su>
					<mp ct="text/plain">
						<content> ${composeContent} </content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);

		// Login as account2
		const acct2Auth = await soap.getAccountAuthToken(account2Name);

		// Get folder IDs
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Auth
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');

		const findFolder = (folders, name) => {
			if (!folders) return null;
			const arr = Array.isArray(folders) ? folders : [folders];
			for (const f of arr) {
				if (f?.name === name) return f.id;
				const sub = findFolder(f?.folder, name);
				if (sub) return sub;
			}
			return null;
		};
		const inboxFolderId = findFolder(getFolderRes.GetFolderResponse?.folder, 'Inbox');
		const trashFolderId = findFolder(getFolderRes.GetFolderResponse?.folder, 'Trash');

		// Wait for message delivery
		await new Promise(r => setTimeout(r, 3000));

		// Search for the message to get its ID
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${composeSubject})</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse?.m;
		assert.exists(msg, 'Message should be found');
		const msgId = msg.id;

		// Move message to trash
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="trash"/>
			</MsgActionRequest>`, acct2Auth
		);
		assert.notExists(trashRes.Fault, 'MsgActionRequest trash should not fault');
		assert.equal(trashRes.MsgActionResponse?.action?.op, 'trash', 'Op should be trash');

		// Empty trash
		const emptyTrashRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="empty" id="${trashFolderId}" recursive="true"/>
			</FolderActionRequest>`, acct2Auth
		);
		assert.notExists(emptyTrashRes.Fault, 'FolderActionRequest empty should not fault');
		assert.equal(emptyTrashRes.FolderActionResponse?.action?.op, 'empty', 'Op should be empty');

		// Recover message from dumpster
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="recover" id="${msgId}" l="${inboxFolderId}"/>
			</MsgActionRequest>`, acct2Auth
		);
		assert.notExists(recoverRes.Fault, 'MsgActionRequest recover should not fault');
		assert.equal(recoverRes.MsgActionResponse?.action?.op, 'recover', 'Op should be recover');

		// Search by content word
		const contentSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>(dumpstertest)</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(contentSearch.Fault, 'Content SearchRequest should not fault');
		const contentMsg = Array.isArray(contentSearch.SearchResponse?.m)
			? contentSearch.SearchResponse.m[0] : contentSearch.SearchResponse?.m;
		assert.exists(contentMsg, 'Recovered message should be searchable by content');

		// Search by subject
		const subjectSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${composeSubject})</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(subjectSearch.Fault, 'Subject SearchRequest should not fault');
		const subjectMsg = Array.isArray(subjectSearch.SearchResponse?.m)
			? subjectSearch.SearchResponse.m[0] : subjectSearch.SearchResponse?.m;
		assert.exists(subjectMsg, 'Recovered message should be searchable by subject');
		assert.match(subjectMsg.su, new RegExp('^' + composeSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			'Subject should match');

		// Search by content again to double confirm
		const contentSearch2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>(dumpstertest)</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(contentSearch2.Fault, 'Content SearchRequest2 should not fault');
		const contentMsg2 = Array.isArray(contentSearch2.SearchResponse?.m)
			? contentSearch2.SearchResponse.m[0] : contentSearch2.SearchResponse?.m;
		assert.exists(contentMsg2, 'Recovered message should still be searchable by content');
		assert.match(contentMsg2.su, new RegExp('^' + composeSubject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
			'Subject should match in content search');
	});
});
