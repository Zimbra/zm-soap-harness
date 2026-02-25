import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Briefcase > Briefcase Upload Files', function () {
	this.timeout(30 * 1000);
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
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
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
	it('Smoke | Upload different type files to the Briefcase', async () => {
		const fileTypes = ['html', 'text', 'jpg', 'csv', 'pdf'];

		for (const fileType of fileTypes) {
			// Save document with inline content (simulating upload)
			const saveRes = await soap.makeSOAPEnvelopeAccount(
				`<SaveDocumentRequest xmlns="urn:zimbraMail">
					<doc name="doc.${common.getUniqueString()}.txt" l="${briefcaseFolderId}">
						<content>Sample ${fileType} file content for upload test</content>
					</doc>
				</SaveDocumentRequest>`, account1Token
			);
			assert.exists(saveRes.SaveDocumentResponse,
				`SaveDocumentResponse should exist for ${fileType}`);
			const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
				? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
			assert.exists(doc.id, `doc id should exist for ${fileType}`);
		}

		// Trash the first document (matching XML test behavior)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:Briefcase</query>
			</SearchRequest>`, account1Token
		);
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const docs = searchRes.SearchResponse.doc;
		assert.exists(docs, 'Should find documents in Briefcase');

		const firstDoc = Array.isArray(docs) ? docs[0] : docs;

		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${firstDoc.id}" op="trash"/>
			</ItemActionRequest>`, account1Token
		);
		assert.exists(trashRes.ItemActionResponse, 'ItemActionResponse should exist');
	});
});
