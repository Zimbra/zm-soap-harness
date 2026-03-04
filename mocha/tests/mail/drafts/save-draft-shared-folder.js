import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Drafts > Save Draft Shared Folder', function () {
	this.timeout(120 * 1000);
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
	it('Smoke | Reply to a message in a shared folder - Save a Draft', async () => {
		// Create test accounts
		const account1Email = `account1${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2${common.getUniqueString()}@${testDomain}`;
		const account1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(account1Res.Fault, 'CreateAccount1 should not fault');
		const account1 = Array.isArray(account1Res.CreateAccountResponse.account)
			? account1Res.CreateAccountResponse.account[0]
			: account1Res.CreateAccountResponse.account;
		const host = account1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Id = account1.id;

		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get inbox folder id for account 1
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		// Create a subfolder under inbox
		const folderName = `folder1.${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox.id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Add message to the folder
		const subject = `subject${common.getUniqueString()}`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Date: Mon, 3 Dec 2007 11:07:57 -0800
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
To: foo@bar.com
From: bar@bar.com
Subject: ${subject}
Content of the message
</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Share the folder with account 2 (manager rights)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Account 2: get inbox folder id
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest for account2 should not fault');
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;

		// Account 2: mount the shared folder
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2.id}" name="folder1${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const sharedFolderId = link.id;

		// Account 2: search in the shared folder for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:(${sharedFolderId})</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const sharedMsgId = msgs[0].id;

		// Account 2: save draft reply to the shared message
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m rt="r" origid="${sharedMsgId}">
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}"/>
					<su>RE: ${subject} </su>
					<mp ct="text/plain">
						<content>more content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account2AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft id should exist');
	});


	it('Sanity | Forward a message in a shared folder - Save a Draft', async () => {
		// Create test accounts
		const account1Email = `account1${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2${common.getUniqueString()}@${testDomain}`;
		const account1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(account1Res.Fault, 'CreateAccount1 should not fault');
		const account1 = Array.isArray(account1Res.CreateAccountResponse.account)
			? account1Res.CreateAccountResponse.account[0]
			: account1Res.CreateAccountResponse.account;
		const host = account1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Id = account1.id;

		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get inbox folder id for account 1
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		// Create a subfolder under inbox
		const folderName = `folder1.${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox.id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Add message to the folder
		const subject = `subject${common.getUniqueString()}`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>Date: Mon, 3 Dec 2007 11:07:57 -0800
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
To: foo@bar.com
From: bar@bar.com
Subject: ${subject}
Content of the message
</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Share the folder with account 2 (manager rights)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Account 2: get inbox folder id
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest for account2 should not fault');
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;

		// Account 2: mount the shared folder
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2.id}" name="folder1${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const sharedFolderId = link.id;

		// Account 2: search in the shared folder for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:(${sharedFolderId})</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const sharedMsgId = msgs[0].id;

		// Account 2: save draft forward of the shared message
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m rt="w" origid="${sharedMsgId}">
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}"/>
					<su>FWD: ${subject} </su>
					<mp ct="text/plain">
						<content>more content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account2AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft id should exist');
	});


	it('Sanity | Forward a message in a shared folder (TNEF attachment) - Save Draft', async () => {
		// Create test accounts
		const account1Email = `account1${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2${common.getUniqueString()}@${testDomain}`;
		const account1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(account1Res.Fault, 'CreateAccount1 should not fault');
		const account1 = Array.isArray(account1Res.CreateAccountResponse.account)
			? account1Res.CreateAccountResponse.account[0]
			: account1Res.CreateAccountResponse.account;
		const host = account1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Id = account1.id;

		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get inbox folder id for account 1
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		// Create a subfolder under inbox
		const folderName = `folder1.${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox.id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Upload the TNEF attachment file
		const filePath = path.join(config.projectRoot, 'mocha/data/email04/email04f.txt');
		const aid = await soap.uploadFile(account1AuthToken, filePath);

		// Add message with TNEF attachment to the folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}" aid="${aid}"/>
			</AddMsgRequest>`, account1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Share the folder with account 2 (manager rights)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

		// Account 2: get inbox folder id
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest for account2 should not fault');
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;

		// Account 2: mount the shared folder
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2.id}" name="folder1${common.getUniqueString()}" zid="${account1Id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const sharedFolderId = link.id;

		// Account 2: search in the shared folder for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:(${sharedFolderId})</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const sharedMsgId = msgs[0].id;

		// Account 2: get the message to find the TNEF attachment part
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sharedMsgId}"/>
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;

		// Find the attachment part (amit_mail.txt from TNEF)
		function findPart(mp, filename) {
			if (!mp) return null;
			const parts = Array.isArray(mp) ? mp : [mp];
			for (const p of parts) {
				if (p.filename === filename) return p;
				const child = findPart(p.mp, filename);
				if (child) return child;
			}
			return null;
		}
		const attachPart = findPart(msg.mp, 'amit_mail.txt');
		assert.exists(attachPart, 'TNEF attachment part should exist');
		const partId = attachPart.part;

		// Account 2: save draft forward with the TNEF attachment
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m rt="w" origid="${sharedMsgId}">
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}"/>
					<su>WG: Rich text (TNEF) test</su>
					<mp ct="text/plain">
						<content>More content</content>
					</mp>
					<attach>
						<mp mid="${sharedMsgId}" part="${partId}"/>
					</attach>
				</m>
			</SaveDraftRequest>`, account2AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft id should exist');
	});
});
