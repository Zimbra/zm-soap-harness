import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Purge Revision Request', function () {
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
	it('Smoke | Purge particular revision of document with multiple revision', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Purge test v1</content>
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
					<content>Purge test v2</content>
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
					<content>Purge test v3</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save3.Fault, 'Response should not be a Fault');
		const doc3 = Array.isArray(save3.SaveDocumentResponse.doc)
			? save3.SaveDocumentResponse.doc[0] : save3.SaveDocumentResponse.doc;
		assert.exists(doc3.id, 'Doc v3 ID should exist');

		// Purge revision 1
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="1" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');

		// Verify revisions after purge
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		assert.exists(revisions, 'Revisions should exist after purge');
	});


	it('Sanity | Purge older revision of document with multiple revision', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Purge older v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revisions 2-4
		for (let i = 2; i <= 4; i++) {

			// SaveDocumentRequest
			const save = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="${docName}" ver="${i - 1}" l="${briefcaseFolderId}" id="${docId}" desc="rev ${i}.0">
						<content>Purge older v${i}</content>
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

		// Purge revision 2 and older (includeOlderRevisions=true)
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="2" includeOlderRevisions="true"/>
			</PurgeRevisionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');

		// Verify remaining revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);

		// Verify response
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		const revisions = listRes.ListDocumentRevisionsResponse.doc;
		assert.exists(revisions, 'Revisions should exist after purge');
	});


	it('Sanity | Purge document with invalid values', async () => {
		// PurgeRevisionRequest
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="99999" ver="1" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);

		// Verify response
		assert.isString(purgeRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
	});


	it('Sanity | Purge document with single revision', async () => {
		// Save a document
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Invalid version test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Purge with invalid version
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="999" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');
	});
});
