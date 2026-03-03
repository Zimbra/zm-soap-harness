import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > On Behalf Of > Mountpoint > Save Draft Request Mountpoint', function () {
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
	it('Sanity | Reply to a message in a mountpoint (read only permission) - try to save as a draft in delegatee folder', async () => {
		// Create test accounts
		const destEmail = `dest${common.getUniqueString()}@${testDomain}`;
		const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
		const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${destEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const createAcct1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct1.Fault, 'CreateAccountRequest should not fault');
		const acct1Obj = Array.isArray(createAcct1.CreateAccountResponse.account) ? createAcct1.CreateAccountResponse.account[0] : createAcct1.CreateAccountResponse.account;
		const acct1Id = acct1Obj.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get inbox folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolderObj = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0] : getFolderRes.GetFolderResponse.folder;
		const folderList = Array.isArray(rootFolderObj.folder) ? rootFolderObj.folder : [rootFolderObj.folder];
		const inboxFolder = folderList.find(f => f.name === 'Inbox');
		const inboxId = inboxFolder.id;

		// Create a folder under inbox
		const folderName = `folder${common.getUniqueString()}`;
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${inboxId}" name="${folderName}"/>
			</CreateFolderRequest>`, acct1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Share the folder with account2 (read only)
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${acct2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1AuthToken
		);
		assert.notExists(shareRes.Fault, 'FolderActionRequest should not fault');

		// Add a message to the folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${subject}
${content}
</content>
				</m>
			</AddMsgRequest>`, acct1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Login as account2
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Get folder info
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest should not fault');
		const rootFolderObj2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0] : getFolderRes2.GetFolderResponse.folder;
		const folderList2 = Array.isArray(rootFolderObj2.folder) ? rootFolderObj2.folder : [rootFolderObj2.folder];
		const inboxFolder2 = folderList2.find(f => f.name === 'Inbox');
		const inbox2Id = inboxFolder2.id;

		// Create mountpoint
		const mountName = `mountpoint${common.getUniqueString()}`;
		const createMountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2Id}" name="${mountName}" view="message" rid="${folderId}" zid="${acct1Id}"/>
			</CreateMountpointRequest>`, acct2AuthToken
		);
		assert.notExists(createMountRes.Fault, 'CreateMountpointRequest should not fault');

		// Search for the remote message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		assert.exists(msgs[0], 'Remote message should be found');

		// Save draft as a reply
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="r" idnt="${acct1Id}">
					<e t="t" a="${destEmail}"/>
					<su>RE: ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, acct2AuthToken
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draftMsg = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0] : draftRes.SaveDraftResponse.m;
		assert.exists(draftMsg.id, 'draft msg id should exist');
		assert.exists(draftRes.SaveDraftResponse.m, 'Draft message should exist');
	});


	it('Sanity | Reply to a message on behalf of in a mountpoint (read only permission) - try to save as a draft in delegatee folder', async () => {
		// Create test accounts
		const destEmail = `dest${common.getUniqueString()}@${testDomain}`;
		const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
		const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${destEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const createAcct1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct1.Fault, 'CreateAccountRequest should not fault');
		const acct1Obj = Array.isArray(createAcct1.CreateAccountResponse.account) ? createAcct1.CreateAccountResponse.account[0] : createAcct1.CreateAccountResponse.account;
		const acct1Id = acct1Obj.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get inbox folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolderObj = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0] : getFolderRes.GetFolderResponse.folder;
		const folderList = Array.isArray(rootFolderObj.folder) ? rootFolderObj.folder : [rootFolderObj.folder];
		const inboxFolder = folderList.find(f => f.name === 'Inbox');
		const inboxId = inboxFolder.id;

		// Create a folder under inbox
		const folderName = `folder${common.getUniqueString()}`;
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${inboxId}" name="${folderName}"/>
			</CreateFolderRequest>`, acct1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = (Array.isArray(createFolderRes.CreateFolderResponse.folder) ? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder).id;

		// Share the folder with account2 (read only)
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${acct2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1AuthToken
		);
		assert.notExists(shareRes.Fault, 'FolderActionRequest should not fault');

		// Add a message to the folder
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${subject}
${content}
</content>
				</m>
			</AddMsgRequest>`, acct1AuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Login as account2
		const acct2AuthToken = await soap.getAccountAuthToken(acct2Email);

		// Get folder info
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'GetFolderRequest should not fault');
		const rootFolderObj2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0] : getFolderRes2.GetFolderResponse.folder;
		const folderList2 = Array.isArray(rootFolderObj2.folder) ? rootFolderObj2.folder : [rootFolderObj2.folder];
		const inboxFolder2 = folderList2.find(f => f.name === 'Inbox');
		const inbox2Id = inboxFolder2.id;

		// Create mountpoint
		const mountName = `mountpoint${common.getUniqueString()}`;
		const createMountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2Id}" name="${mountName}" view="message" rid="${folderId}" zid="${acct1Id}"/>
			</CreateMountpointRequest>`, acct2AuthToken
		);
		assert.notExists(createMountRes.Fault, 'CreateMountpointRequest should not fault');

		// Search for the remote message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Save draft as reply on behalf of account1
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="r" idnt="${acct1Id}">
					<e t="t" a="${destEmail}"/>
					<e t="f" a="${acct1Email}"/>
					<e t="s" a="${acct2Email}"/>
					<su>RE: ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, acct2AuthToken
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draftMsg = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0] : draftRes.SaveDraftResponse.m;
		assert.exists(draftMsg.id, 'draft msg id should exist');
		assert.exists(draftRes.SaveDraftResponse.m, 'Draft message should exist');
	});
});
