import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Briefcase > List Document Revisions', function () {
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
	it('Smoke | listdocument revision request for non existing document', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Revision 1 content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

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
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// List revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		assert.exists(revisions, 'Should have revisions');

		const revDoc = Array.isArray(revisions) ? revisions[0] : revisions;
		assert.isAtLeast(revDoc.ver, 2, 'Should have at least 2 revisions');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify version', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Wiki version 1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

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
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// Save revision 3
		const save3 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="2" l="${briefcaseFolderId}" id="${docId}" desc="rev 3.0">
					<content>Wiki version 3</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save3.Fault, 'Response should not be a Fault');
		assert.exists(save3.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// List revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		const revDoc = Array.isArray(revisions) ? revisions[0] : revisions;
		assert.isAtLeast(revDoc.ver, 3, 'Should have at least 3 revisions');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify count', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Count test v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save multiple revisions
		for (let i = 2; i <= 4; i++) {
			const save = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="${docName}" ver="${i - 1}" l="${briefcaseFolderId}" id="${docId}" desc="rev ${i}.0">
						<content>Count test v${i}</content>
					</doc>
				</SaveDocumentRequest>`, account1Token
			);
			assert.notExists(save.Fault, 'Response should not be a Fault');
			assert.exists(save.SaveDocumentResponse,
				`SaveDocumentResponse v${i} should exist`);
		}

		// List revisions with count=2
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail" count="2">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
	});


	it('Sanity | Upload document with multiple revisions and list revisions specify version 1', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Version param test v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

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
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// List revisions from version 1
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail" ver="1">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
	});


	it('Sanity | listdocument revision request for non existing document', async () => {
		// Save document
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Trash test content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

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
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// Trash the document
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${docId}" op="trash"/>
			</ItemActionRequest>`, account1Token
		);
		assert.notExists(trashRes.Fault, 'Response should not be a Fault');
		assert.exists(trashRes.ItemActionResponse, 'ItemActionResponse should exist');

		// List revisions of trashed document
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
	});
});
