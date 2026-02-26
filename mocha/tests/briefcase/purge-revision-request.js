import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Briefcase > Purge Revision Request', function () {
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
	it('Smoke | Purge particular revision of document with multiple revision', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Purge test v1</content>
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
					<content>Purge test v2</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// Save revision 3
		const save3 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="2" l="${briefcaseFolderId}" id="${docId}" desc="rev 3.0">
					<content>Purge test v3</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save3.Fault, 'Response should not be a Fault');
		assert.exists(save3.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		// Purge revision 1
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="1" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');
		assert.exists(purgeRes.PurgeRevisionResponse,
			'PurgeRevisionResponse should exist');

		// Verify revisions after purge
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
	});


	it('Sanity | Purge older revision of document with multiple revision', async () => {
		// Save document v1
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Purge older v1</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Save revisions 2-4
		for (let i = 2; i <= 4; i++) {
			const save = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="${docName}" ver="${i - 1}" l="${briefcaseFolderId}" id="${docId}" desc="rev ${i}.0">
						<content>Purge older v${i}</content>
					</doc>
				</SaveDocumentRequest>`, account1Token
			);
			assert.notExists(save.Fault, 'Response should not be a Fault');
			assert.exists(save.SaveDocumentResponse,
				`SaveDocumentResponse v${i} should exist`);
		}

		// Purge revision 2 and older (includeOlderRevisions=true)
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="2" includeOlderRevisions="true"/>
			</PurgeRevisionRequest>`, account1Token
		);
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');
		assert.exists(purgeRes.PurgeRevisionResponse,
			'PurgeRevisionResponse should exist');

		// Verify remaining revisions
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<ListDocumentRevisionsRequest xmlns="urn:zimbraMail">
				<doc id="${docId}"/>
			</ListDocumentRevisionsRequest>`, account1Token
		);
		assert.notExists(listRes.Fault, 'Response should not be a Fault');
		assert.exists(listRes.ListDocumentRevisionsResponse,
			'ListDocumentRevisionsResponse should exist');
	});


	it('Sanity | Purge document with invalid values', async () => {
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="99999" ver="1" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);
		assert.exists(purgeRes.Fault, 'Should return Fault for invalid document id');
		assert.exists(purgeRes.Fault.Detail.Error.Code, 'Error code should exist');
	});


	it('Sanity | Purge document with single revision', async () => {
		// Save a document
		const docName = 'doc.' + common.getUniqueString() + '.txt';
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Invalid version test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const docId = doc.id;

		// Purge with invalid version
		const purgeRes = await soap.makeSOAPEnvelopeAccount(
			`<PurgeRevisionRequest xmlns="urn:zimbraMail">
				<revision id="${docId}" ver="999" includeOlderRevisions="false"/>
			</PurgeRevisionRequest>`, account1Token
		);
		assert.notExists(purgeRes.Fault, 'Response should not be a Fault');
		assert.exists(purgeRes.PurgeRevisionResponse,
			'PurgeRevisionResponse should exist for invalid version');
	});
});
