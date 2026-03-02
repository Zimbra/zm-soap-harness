import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Tags > Tag Briefcase Docs', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount('<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token);

		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0]
			: folderRes.GetFolderResponse.folder;
		const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = subfolders.find(f => f && f.name === 'Briefcase');
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
	it('Sanity | Search for a tagged briefcase documents', async () => {
		// Create a tag
		const tagName = 'Tag.' + common.getUniqueString();

		// CreateTagRequest
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, account1Token
		);

		// Verify response
		assert.notExists(tagRes.Fault, 'Response should not be a Fault');
		const createdTag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		assert.exists(createdTag, 'CreateTagResponse should contain tag');

		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		tag.id;

		// Save a document
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>Tagged document content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Tag the document
		const tagActionRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="tag" tn="${tagName}"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(tagActionRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(tagActionRes.ItemActionResponse.action)
			? tagActionRes.ItemActionResponse.action[0] : tagActionRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');

		// Search for tagged documents
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
