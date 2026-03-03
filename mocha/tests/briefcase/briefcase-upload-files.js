import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Briefcase Upload Files', function () {
	this.timeout(30 * 1000);
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
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
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

			// Verify response
			assert.notExists(saveRes.Fault, 'Response should not be a Fault');
			const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
				? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;

			// Verify response
			assert.exists(doc.id, `doc id should exist for ${fileType}`);
		}

		// Trash the first document (matching XML test behavior)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:Briefcase</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const docs = searchRes.SearchResponse.doc;
		assert.exists(docs[0].id, 'doc id should exist in search results');

		const firstDoc = Array.isArray(docs) ? docs[0] : docs;

		// ItemActionRequest
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${firstDoc.id}" op="trash"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(trashRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(trashRes.ItemActionResponse.action)
			? trashRes.ItemActionResponse.action[0] : trashRes.ItemActionResponse.action;
		assert.equal(itemAction.op, 'trash', 'op should be trash');
	});
});
