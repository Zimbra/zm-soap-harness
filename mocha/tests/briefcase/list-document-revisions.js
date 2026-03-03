import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > List Document Revisions', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');

		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
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
	it('Smoke | Listdocument revision request for non existing document', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Revision 1 content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revision 2
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="1" l="${briefcaseFolderId}" id="${docId}" desc="rev 2.0">
					<content>Revision 2 content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// List revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;

		// Verify response
		assert.exists(revisions, 'Should have revisions');

		const revDoc = Array.isArray(revisions) ? revisions[0] : revisions;

		// Verify response
		assert.isAtLeast(revDoc.ver, 2, 'Should have at least 2 revisions');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify version', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Wiki version 1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revision 2
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="1" l="${briefcaseFolderId}" id="${docId}" desc="rev 2.0">
					<content>Wiki version 2</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// Save revision 3
		const save3 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="2" l="${briefcaseFolderId}" id="${docId}" desc="rev 3.0">
					<content>Wiki version 3</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save3.Fault, 'Response should not be a Fault');
		const doc3 = Array.isArray(save3.SaveDocumentResponse.doc)
			? save3.SaveDocumentResponse.doc[0] : save3.SaveDocumentResponse.doc;
		assert.exists(doc3.id, 'Doc v3 ID should exist');

		// List revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		const revDoc = Array.isArray(revisions) ? revisions[0] : revisions;

		// Verify response
		assert.isAtLeast(revDoc.ver, 3, 'Should have at least 3 revisions');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify count', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Count test v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save multiple revisions
		for (let i = 2; i <= 4; i++) {

			// SaveDocumentRequest
			const save = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="${docName}" ver="${i - 1}" l="${briefcaseFolderId}" id="${docId}" desc="rev ${i}.0">
						<content>Count test v${i}</content>
					</doc>
				</SaveDocumentRequest>`, account1Token
			);

			// Verify response
			assert.notExists(save.Fault, 'Response should not be a Fault');
			const savedDoc = Array.isArray(save.SaveDocumentResponse.doc)
				? save.SaveDocumentResponse.doc[0] : save.SaveDocumentResponse.doc;
			assert.exists(savedDoc.id,
				`Doc v${i} ID should exist`);
		}

		// List revisions with count=2
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail" count="2">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify version 1', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Version param test v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revision 2
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="1" l="${briefcaseFolderId}" id="${docId}" desc="rev 2.0">
					<content>Version param test v2</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// List revisions from version 1
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail" ver="1">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Listdocument revision request for non existing document', async () => {
		// Save document
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Trash test content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revision 2
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="1" l="${briefcaseFolderId}" id="${docId}" desc="rev 2.0">
					<content>Trash test content v2</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// Trash the document
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="trash"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(trashRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(trashRes.ItemActionResponse.action)
			? trashRes.ItemActionResponse.action[0] : trashRes.ItemActionResponse.action;
		assert.equal(itemAction.op, 'trash', 'op should be trash');

		// List revisions of trashed document
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		assert.exists(revisions, 'Revisions should exist after trashing');
	});
});
