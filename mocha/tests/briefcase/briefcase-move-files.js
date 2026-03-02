import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Briefcase > Briefcase Move Files', function () {
	this.timeout(60 * 1000);
	let account1Token;

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
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

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
	it('Sanity | Create briefcase folders and move files among those folders', async () => {
		const folder1Name = 'Briefcase.' + common.getUniqueString();
		const folder2Name = 'Briefcase.' + common.getUniqueString();

		// Create folder1
		const create1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder1Name}"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(create1.Fault, 'Response should not be a Fault');
		const createdFolder = Array.isArray(create1.CreateFolderResponse.folder)
			? create1.CreateFolderResponse.folder[0] : create1.CreateFolderResponse.folder;
		assert.exists(createdFolder, 'CreateFolderResponse should contain folder');

		const folder1 = Array.isArray(create1.CreateFolderResponse.folder)
			? create1.CreateFolderResponse.folder[0] : create1.CreateFolderResponse.folder;
		const folder1Id = folder1.id;

		// Create folder2
		const create2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder2Name}"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(create2.Fault, 'Response should not be a Fault');

		const folder2 = Array.isArray(create2.CreateFolderResponse.folder)
			? create2.CreateFolderResponse.folder[0] : create2.CreateFolderResponse.folder;
		const folder2Id = folder2.id;

		// Save doc to folder1
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${folder1Id}">
					<content>HTML file content for move test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save1.Fault, 'Response should not be a Fault');
		assert.exists(save1.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc1 = Array.isArray(save1.SaveDocumentResponse.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse.doc;
		const doc1Id = doc1.id;

		// Move doc from folder1 to folder2
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${doc1Id}" l="${folder2Id}" op="move"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(moveRes.ItemActionResponse.action)
			? moveRes.ItemActionResponse.action[0] : moveRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');

		// Save another doc to folder2
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="doc.${common.getUniqueString()}.txt" l="${folder2Id}">
					<content>Text file content for move test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(save2.Fault, 'Response should not be a Fault');
		assert.exists(save2.SaveDocumentResponse, 'SaveDocumentResponse should exist');

		const doc2 = Array.isArray(save2.SaveDocumentResponse.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse.doc;
		const doc2Id = doc2.id;

		// Move doc2 from folder2 to folder1
		const move2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${doc2Id}" l="${folder1Id}" op="move"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(move2.Fault, 'Response should not be a Fault');

		// Search folder1 to verify doc2 is there
		const search1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:"${folder1Name}"</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(search1.Fault, 'Response should not be a Fault');
		assert.exists(search1.SearchResponse, 'SearchResponse should exist');

		// Search folder2 to verify doc1 is there
		const search2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:"${folder2Name}"</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(search2.Fault, 'Response should not be a Fault');
		assert.exists(search2.SearchResponse, 'SearchResponse should exist');
	});
});
