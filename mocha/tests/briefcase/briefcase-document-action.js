import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Briefcase Document Action', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Token;
	let account2Name;
	let account2Zid;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		// Create account2
		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		account2Zid = acct2.id;

		// Auth as account1
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Get briefcase folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');

		const folders = folderRes.GetFolderResponse.folder;
		const root = Array.isArray(folders) ? folders[0] : folders;
		const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = subfolders.find(f => f && f.name === 'Briefcase');

		// Verify response
		assert.exists(briefcase, 'Briefcase folder should exist');
		briefcaseFolderId = briefcase.id;
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
	it('Smoke | Verify watch feature for DocumentActionRequest', async () => {
		// Save a document with inline content
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>Sample PDF content for watch test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Add to watch list
		const watchRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="watch"/>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(watchRes.Fault, 'Response should not be a Fault');
		assert.exists(watchRes.DocumentActionResponse,
			'DocumentActionResponse should exist');
		const watchAction = Array.isArray(watchRes.DocumentActionResponse.action)
			? watchRes.DocumentActionResponse.action[0] : watchRes.DocumentActionResponse.action;

		// Verify response
		assert.equal(watchAction.id, docId, 'action id should match document id');
		assert.equal(watchAction.op, 'watch', 'op should be watch');

		// Verify watch list
		const watchItemsRes = await soap.makeSOAPEnvelopeAccount(
			'<GetWatchingItemsRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(watchItemsRes.Fault, 'Response should not be a Fault');
		assert.exists(watchItemsRes.GetWatchingItemsResponse,
			'GetWatchingItemsResponse should exist');

		// Remove from watch list
		const unwatchRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="!watch"/>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(unwatchRes.Fault, 'Response should not be a Fault');
		assert.exists(unwatchRes.DocumentActionResponse,
			'DocumentActionResponse should exist');

		// Verify removed from watch list
		const watchItems2 = await soap.makeSOAPEnvelopeAccount(
			'<GetWatchingItemsRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(watchItems2.Fault, 'Response should not be a Fault');
		assert.exists(watchItems2.GetWatchingItemsResponse,
			'GetWatchingItemsResponse should exist');
	});


	it('Smoke | Verify document share URL', async () => {
		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>Sample text content for share URL test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Get document share URL
		const shareUrlRes = await soap.makeSOAPEnvelopeAccount(
			`<GetDocumentShareURLRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetDocumentShareURLRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareUrlRes.Fault, 'Response should not be a Fault');
		assert.exists(shareUrlRes.GetDocumentShareURLResponse,
			'GetDocumentShareURLResponse should exist');

		// Get share details
		const shareDetailsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareDetailsRes.Fault, 'Response should not be a Fault');
		assert.exists(shareDetailsRes.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const item = Array.isArray(shareDetailsRes.GetShareDetailsResponse.item)
			? shareDetailsRes.GetShareDetailsResponse.item[0]
			: shareDetailsRes.GetShareDetailsResponse.item;

		// Verify response
		assert.equal(item.id, docId, 'item id should match document id');
	});


	it('Smoke | Verify grant to user feature for DocumentActionRequest', async () => {
		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>JPG placeholder content for grant test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Grant rwd to user2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="grant">
					<grant perm="rwd" gt="usr" zid="${account2Zid}"/>
				</action>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
		assert.exists(grantRes.DocumentActionResponse,
			'DocumentActionResponse should exist');
		const grantAction = Array.isArray(grantRes.DocumentActionResponse.action)
			? grantRes.DocumentActionResponse.action[0] : grantRes.DocumentActionResponse.action;

		// Verify response
		assert.equal(grantAction.id, docId, 'action id should match');
		assert.equal(grantAction.op, 'grant', 'op should be grant');

		// Verify share details
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		assert.exists(shareRes.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const shareItem = Array.isArray(shareRes.GetShareDetailsResponse.item)
			? shareRes.GetShareDetailsResponse.item[0] : shareRes.GetShareDetailsResponse.item;

		// Verify response
		assert.equal(shareItem.id, docId, 'item id should match');

		const grantee = Array.isArray(shareItem.grantee)
			? shareItem.grantee[0] : shareItem.grantee;

		// Verify response
		assert.equal(grantee.perm, 'rwd', 'perm should be rwd');
		assert.equal(grantee.gt, 'usr', 'gt should be usr');

		// Revoke grant
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="!grant" zid="${account2Zid}"/>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		assert.exists(revokeRes.DocumentActionResponse,
			'DocumentActionResponse should exist');

		// Verify grant revoked
		const share2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(share2Res.Fault, 'Response should not be a Fault');
		assert.exists(share2Res.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const item2 = Array.isArray(share2Res.GetShareDetailsResponse.item)
			? share2Res.GetShareDetailsResponse.item[0] : share2Res.GetShareDetailsResponse.item;

		// Verify response
		assert.notExists(item2.grantee, 'grantee should not exist after revoke');
	});


	it('Smoke | Verify grant to public feature for DocumentActionRequest', async () => {
		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>HTML placeholder content for public grant test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Grant rwd to public
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="grant">
					<grant perm="rwd" gt="pub"/>
				</action>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
		assert.exists(grantRes.DocumentActionResponse,
			'DocumentActionResponse should exist');
		const grantAction = Array.isArray(grantRes.DocumentActionResponse.action)
			? grantRes.DocumentActionResponse.action[0] : grantRes.DocumentActionResponse.action;

		// Verify response
		assert.equal(grantAction.id, docId, 'action id should match');
		assert.equal(grantAction.op, 'grant', 'op should be grant');

		// Verify share details
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		assert.exists(shareRes.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const shareItem = Array.isArray(shareRes.GetShareDetailsResponse.item)
			? shareRes.GetShareDetailsResponse.item[0] : shareRes.GetShareDetailsResponse.item;

		// Verify response
		assert.equal(shareItem.id, docId, 'item id should match');

		const grantee = Array.isArray(shareItem.grantee)
			? shareItem.grantee[0] : shareItem.grantee;

		// Verify response
		assert.equal(grantee.perm, 'rwd', 'perm should be rwd');
		assert.equal(grantee.gt, 'pub', 'gt should be pub');

		// Revoke public grant
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="!grant" zid="99999999-9999-9999-9999-999999999999"/>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		assert.exists(revokeRes.DocumentActionResponse,
			'DocumentActionResponse should exist');

		// Verify grant revoked
		const share2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(share2Res.Fault, 'Response should not be a Fault');
		assert.exists(share2Res.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const item2 = Array.isArray(share2Res.GetShareDetailsResponse.item)
			? share2Res.GetShareDetailsResponse.item[0] : share2Res.GetShareDetailsResponse.item;

		// Verify response
		assert.notExists(item2.grantee, 'grantee should not exist after revoke');
	});


	it('Smoke | Verify grant to all feature for DocumentActionRequest', async () => {
		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>CSV placeholder content for all grant test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Grant rwd to all
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="grant">
					<grant perm="rwd" gt="all"/>
				</action>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
		assert.exists(grantRes.DocumentActionResponse,
			'DocumentActionResponse should exist');
		const grantAction = Array.isArray(grantRes.DocumentActionResponse.action)
			? grantRes.DocumentActionResponse.action[0] : grantRes.DocumentActionResponse.action;

		// Verify response
		assert.equal(grantAction.id, docId, 'action id should match');
		assert.equal(grantAction.op, 'grant', 'op should be grant');

		// Verify share details
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		assert.exists(shareRes.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const shareItem = Array.isArray(shareRes.GetShareDetailsResponse.item)
			? shareRes.GetShareDetailsResponse.item[0] : shareRes.GetShareDetailsResponse.item;

		// Verify response
		assert.equal(shareItem.id, docId, 'item id should match');

		const grantee = Array.isArray(shareItem.grantee)
			? shareItem.grantee[0] : shareItem.grantee;

		// Verify response
		assert.equal(grantee.gt, 'all', 'gt should be all');
		assert.equal(grantee.perm, 'rwd', 'perm should be rwd');

		// Revoke all grant
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<DocumentActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="!grant" zid="00000000-0000-0000-0000-000000000000"/>
			</DocumentActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		assert.exists(revokeRes.DocumentActionResponse,
			'DocumentActionResponse should exist');

		// Verify grant revoked
		const share2Res = await soap.makeSOAPEnvelopeAccount(
			`<GetShareDetailsRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetShareDetailsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(share2Res.Fault, 'Response should not be a Fault');
		assert.exists(share2Res.GetShareDetailsResponse,
			'GetShareDetailsResponse should exist');
		const item2 = Array.isArray(share2Res.GetShareDetailsResponse.item)
			? share2Res.GetShareDetailsResponse.item[0] : share2Res.GetShareDetailsResponse.item;

		// Verify response
		assert.notExists(item2.grantee, 'grantee should not exist after revoke');
	});
});
