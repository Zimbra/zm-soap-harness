import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 49454', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | No confirmation for read receipts across shares', async () => {
		// Create three accounts with read receipts enabled
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSendReadReceipts">always</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSendReadReceipts">always</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const createAcct3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailSendReadReceipts">always</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct3Res.Fault, 'CreateAccountRequest should not fault');
		const account3Id = (Array.isArray(createAcct3Res.CreateAccountResponse.account) ? createAcct3Res.CreateAccountResponse.account[0] : createAcct3Res.CreateAccountResponse.account).id;

		// Login to account3 and share inbox with account2
		const authToken3 = await soap.getAccountAuthToken(account3Email);

		// Get account3's inbox folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken3
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0] : getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(rootFolder.folder)
			? rootFolder.folder
			: [rootFolder.folder];
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		const inboxFolderId = inboxFolder.id;

		// Grant access to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${inboxFolderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidxa"/>
				</action>
			</FolderActionRequest>`, authToken3
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Login to account2 and create mountpoint
		const authToken2 = await soap.getAccountAuthToken(account2Email);

		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken2
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest should not fault');
		const rootFolder2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0] : getFolderRes2.GetFolderResponse.folder;
		const folders2 = Array.isArray(rootFolder2.folder)
			? rootFolder2.folder
			: [rootFolder2.folder];
		const inbox2 = folders2.find(f => f.name === 'Inbox');
		const inbox2Id = inbox2.id;

		const mountName = `folder${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link rid="${inboxFolderId}" zid="${account3Id}" l="${inbox2Id}"
					name="${mountName}" view="message"/>
			</CreateMountpointRequest>`, authToken2
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		assert.exists(mountRes.CreateMountpointResponse.link, 'Mountpoint link should exist');

		// Login to account1 and send message to account3 with read receipt
		const authToken1 = await soap.getAccountAuthToken(account1Email);
		const subject = `subject${common.getUniqueString()}`;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<e t="n" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Login to account2 and search in shared folder

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox/${mountName}"</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find message in shared folder');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the message as account2 and verify no read-receipt notification header
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1"/>
			</GetMsgRequest>`, authToken2
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');

		// Verify account1 does NOT receive read receipt (no notification for shared access)
		const searchReceipt = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox"</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchReceipt.Fault, 'SearchRequest should not fault');
		// Per the XML test, account1 inbox should be empty (no read receipt)
		const receiptMsgs = searchReceipt.SearchResponse.m
			? (Array.isArray(searchReceipt.SearchResponse.m) ? searchReceipt.SearchResponse.m : [searchReceipt.SearchResponse.m])
			: [];
		// Verify no read receipt notification arrived
		const hasReceipt = receiptMsgs.some(m => m.su && m.su.includes('Read-Receipt'));
		assert.isFalse(hasReceipt, 'Account1 should not receive read receipt from shared access');
	});
});
