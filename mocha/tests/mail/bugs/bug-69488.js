import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 69488', function () {
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
	it('Sanity | ParseException when forwarding a message with a voicemail attachment', async () => {
		// Create accounts
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Inject the MIME message with voicemail attachment
		const filePath = path.join(
			config.projectRoot, 'mocha/data/bugs/69488/bug69488.txt'
		);
		// Get account auth token
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		await soap.injectMime(account1AuthToken, filePath);

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>Voicemail</query>
			</SearchRequest>`, account1AuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should be found');
		const mailId = msgs[0].id;

		// Get full message and verify mp3 attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mailId}"/>
			</GetMsgRequest>`, account1AuthToken
		);

		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');

		// Forward the message to account2
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${mailId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: Voicemail</su>
					<mp ct="multipart/mixed">
						<content>----- Forwarded Message -----</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});


	it('Sanity | ParseException forwarding voicemail from shared folder', async () => {
		// Create accounts
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test3.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes3.Fault, 'CreateAccountRequest should not fault');
		const account3Id = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0].id
			: createRes3.CreateAccountResponse.account.id;

		// Inject voicemail MIME to account3
		const filePath = path.join(
			config.projectRoot, 'mocha/data/bugs/69488/bug69488.txt'
		);
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		await soap.injectMime(account3AuthToken, filePath);

		// Account3 shares inbox with account2 (manager rights)
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const folders = getFolderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const inboxFolder = Array.isArray(rootFolder.folder)
			? rootFolder.folder.find(f => f.name === 'Inbox')
			: rootFolder.folder;
		const inboxId = inboxFolder.id;

		// Grant manager rights to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Account2 creates mountpoint
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest should not fault');
		const folders2 = getFolderRes2.GetFolderResponse.folder;
		const rootFolder2 = Array.isArray(folders2) ? folders2[0] : folders2;
		const inboxFolder2 = Array.isArray(rootFolder2.folder)
			? rootFolder2.folder.find(f => f.name === 'Inbox')
			: rootFolder2.folder;
		const inbox2Id = inboxFolder2.id;

		const mountName = `folder1${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2Id}" name="${mountName}" zid="${account3Id}"
					rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');

		// Search in shared folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"inbox/${mountName}" Voicemail</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should be found in shared folder');

		// Forward from shared folder
		const mailId = msgs[0].id;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${mailId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: Voicemail</su>
					<mp ct="multipart/mixed">
						<content>----- Forwarded Message -----</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});


	it('Sanity | Invalid request error on reading share modified mail', async () => {
		// Create accounts
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Account1 grants viewer rights to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		const folders = getFolderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const inboxFolder = Array.isArray(rootFolder.folder)
			? rootFolder.folder.find(f => f.name === 'Inbox')
			: rootFolder.folder;
		const inboxId = inboxFolder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${account2Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account2 creates mountpoint
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		const folders2 = getFolderRes2.GetFolderResponse.folder;
		const rootFolder2 = Array.isArray(folders2) ? folders2[0] : folders2;
		const inboxFolder2 = Array.isArray(rootFolder2.folder)
			? rootFolder2.folder.find(f => f.name === 'Inbox')
			: rootFolder2.folder;
		const inbox2Id = inboxFolder2.id;

		const mountName = `folder1${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2Id}" name="${mountName}" zid="${account1Id}"
					rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		// Account1 upgrades share to manager rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account1 sends share notification
		await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail" action="edit">
				<item id="${inboxId}"/>
				<e a="${account2Email}"/>
				<notes></notes>
			</SendShareNotificationRequest>`, account1AuthToken
		);

		// Wait for notification delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account2 searches for share notification
		const account2AuthToken2 = await soap.getAccountAuthToken(account2Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account2AuthToken2
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Share notification message should exist');

		const shareMsg = msgs.find(m => m.su &&
			m.su.includes('Share Modified'));
		assert.exists(shareMsg, 'Share Modified notification should exist');

		// Get the share modified message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${shareMsg.id}"/>
			</GetMsgRequest>`, account2AuthToken2
		);

		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.include(msg.su,
			`Share Modified: Inbox shared by ${account1Email}`,
			'Subject should indicate share modification');
	});
});
