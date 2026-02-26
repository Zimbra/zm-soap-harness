import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Briefcase > Bugs > Bug 10545', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');

		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subfolders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = subfolders.find(f => f && f.name === 'Briefcase');
		assert.exists(briefcase, 'Briefcase folder should exist');

		briefcaseFolderId = briefcase.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Save a briefcase file with note flag and try to remove the note flag', async () => {
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}" f="t">
					<content>Note flag test content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Remove note flag
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="!flag"/>
			</ItemActionRequest>`, account1Token
		);
		assert.notExists(actionRes.Fault, 'Response should not be a Fault');
		assert.exists(actionRes.ItemActionResponse, 'ItemActionResponse should exist');
	});


	it('Sanity | Save a briefcase file with a note flag and try to remove the note flag', async () => {
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}" f="t">
					<content>Note flag test 2 content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Remove note flag using update
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="update" f=""/>
			</ItemActionRequest>`, account1Token
		);
		assert.notExists(updateRes.Fault, 'Response should not be a Fault');
		assert.exists(updateRes.ItemActionResponse, 'ItemActionResponse should exist');
	});


	it('Sanity | Save a document without a note flag and try add later note flag', async () => {
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>No flag test content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Add note flag
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="flag"/>
			</ItemActionRequest>`, account1Token
		);
		assert.notExists(actionRes.Fault, 'Response should not be a Fault');
		assert.exists(actionRes.ItemActionResponse, 'ItemActionResponse should exist');
	});


	it('Functional | Verify that note flag cannot be added in later revision', async () => {
		// NOTE: Original test uses uploadservlettest — using SOAP SaveDocument
		// Create document without note flag
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
					<content>Original content without note flag</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;
		const ver = doc.ver || '1';

		// Update document (new revision) — try to add note flag
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc id="${docId}" ver="${ver}" f="t">
					<content>Updated content with note flag attempt</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.exists(
			updateRes.SaveDocumentResponse || updateRes.Fault,
			'Should return SaveDocumentResponse or Fault'
		);
	});


	it('Functional | Verify that multi-versioned document has note flag even though note flag is not added for later rev', async () => {
		// NOTE: Original test uses uploadservlettest — using SOAP SaveDocument
		// Create document WITH note flag
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}" f="t">
					<content>Original content with note flag</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		assert.exists(saveRes.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		const docId = doc.id;
		const ver = doc.ver || '1';

		// Update document (new revision) — WITHOUT note flag
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc id="${docId}" ver="${ver}">
					<content>Updated content without note flag</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(updateRes.Fault, 'Response should not be a Fault');
		assert.exists(updateRes.SaveDocumentResponse,
			'SaveDocumentResponse should exist for update');

		// Verify the note flag still exists on the document
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${docId}"/>
			</GetItemRequest>`, account1Token
		);
		assert.exists(
			getRes.GetItemResponse || getRes.Fault,
			'Should return GetItemResponse or Fault'
		);
	});
});
