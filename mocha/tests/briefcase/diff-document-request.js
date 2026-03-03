import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Diff Document Request', function () {
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
	it('Sanity | Verify user can retrieve line by line difference of two revisions of a document', async () => {
		// Save initial version of document
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Line 1 original\nLine 2 original\nLine 3 common</content>
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
					<content>Line 1 modified\nLine 2 modified\nLine 3 common</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// Diff the two revisions
		const diffRes = await soap.makeSOAPEnvelopeAccount(
			`<DiffDocumentRequest xmlns="urn:zimbraMail">
				<doc v1="1" v2="2" l="${briefcaseFolderId}" id="${docId}"/>
			</DiffDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(diffRes.Fault, 'Response should not be a Fault');
		assert.exists(diffRes.DiffDocumentResponse.chunk,
			'chunk should exist in diff response');
	});


	it('Sanity | Verify user can retrieve line by line difference of two revisions of a WikiItem', async () => {
		// Save initial version (wiki file)
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>&lt;html&gt;&lt;body&gt;Wiki version 1&lt;/body&gt;&lt;/html&gt;</content>
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
					<content>&lt;html&gt;&lt;body&gt;Wiki version 2 modified&lt;/body&gt;&lt;/html&gt;</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// Diff the two revisions
		const diffRes = await soap.makeSOAPEnvelopeAccount(
			`<DiffDocumentRequest xmlns="urn:zimbraMail">
				<doc v1="1" v2="2" l="${briefcaseFolderId}" id="${docId}"/>
			</DiffDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(diffRes.Fault, 'Response should not be a Fault');
		assert.exists(diffRes.DiffDocumentResponse.chunk, 'chunk should exist');
	});


	it('Sanity | Send DiffDocumentRequest with invalid value for verison V1 - serviceINVALIDREQUEST', async () => {
		// Save a document
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Content for invalid v1 test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Diff with invalid v1
		const diffRes = await soap.makeSOAPEnvelopeAccount(
			`<DiffDocumentRequest xmlns="urn:zimbraMail">
				<doc v1="aa" v2="2" id="${docId}"/>
			</DiffDocumentRequest>`, account1Token
		);

		// Verify response
		assert.isString(diffRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(diffRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});


	it('Sanity | Send DiffDocumentRequest with invalid value for version V2 - serviceINVALIDREQUEST', async () => {
		// Save a document and create revision
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Content for invalid v2 test</content>
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
					<content>Content for invalid v2 test - revised</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		assert.exists(doc2.id, 'Doc v2 ID should exist');

		// Diff with invalid v2
		const diffRes = await soap.makeSOAPEnvelopeAccount(
			`<DiffDocumentRequest xmlns="urn:zimbraMail">
				<doc v1="1" v2="aa" id="${docId}"/>
			</DiffDocumentRequest>`, account1Token
		);

		// Verify response
		assert.isString(diffRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(diffRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});
});
