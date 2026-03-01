import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Waitset > Briefcase Waitset', function () {
	this.timeout(120 * 1000);
	let account1Name;
	let account1Token;
	let briefcaseFolderId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

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
	it('Smoke | Smoke Test Case for WaitSetRequest on document', async () => {
		// Create a waitset
		const createWS = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="d">
				<add>
					<a name="${account1Name}"/>
				</add>
			</CreateWaitSetRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createWS.Fault, 'Response should not be a Fault');
		assert.exists(createWS.CreateWaitSetResponse,
			'CreateWaitSetResponse should exist');
		const wsId = createWS.CreateWaitSetResponse.waitSet;
		const seq = createWS.CreateWaitSetResponse.seq;

		// Verify response
		assert.exists(wsId, 'waitSet id should exist');
		assert.exists(seq, 'seq should exist');

		// Save a document to trigger waitset
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Waitset trigger content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// WaitSet request
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}" seq="${seq}" block="0" timeout="5000"/>`, account1Token
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'Response should not be a Fault');
		assert.exists(waitRes.WaitSetResponse, 'WaitSetResponse should exist');

		// Destroy waitset
		const destroyRes = await soap.makeSOAPEnvelopeAccount(
			`<DestroyWaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}"/>`, account1Token
		);

		// Verify response
		assert.notExists(destroyRes.Fault, 'Response should not be a Fault');
		assert.exists(destroyRes.DestroyWaitSetResponse,
			'DestroyWaitSetResponse should exist');
	});


	it('Sanity | Basic Test Case for WaitSetRequest on document 1', async () => {
		// Create waitset
		const createWS = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="d">
				<add>
					<a name="${account1Name}"/>
				</add>
			</CreateWaitSetRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createWS.Fault, 'Response should not be a Fault');
		assert.exists(createWS.CreateWaitSetResponse,
			'CreateWaitSetResponse should exist');
		const wsId = createWS.CreateWaitSetResponse.waitSet;
		const seq = createWS.CreateWaitSetResponse.seq;

		// Save doc
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Waitset add test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0]
			: saveRes.SaveDocumentResponse.doc;

		// WaitSet
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}" seq="${seq}" block="0" timeout="5000"/>`, account1Token
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'Response should not be a Fault');
		assert.exists(waitRes.WaitSetResponse, 'WaitSetResponse should exist');

		// Modify document
		await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" ver="1" l="${briefcaseFolderId}" id="${doc.id}" desc="updated">
					<content>Waitset modified content</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);

		// WaitSet again
		const newSeq = waitRes.WaitSetResponse.seq || seq;

		// WaitSetRequest
		const waitRes2 = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}" seq="${newSeq}" block="0" timeout="5000"/>`, account1Token
		);

		// Verify response
		assert.notExists(waitRes2.Fault, 'Response should not be a Fault');
		assert.exists(waitRes2.WaitSetResponse, 'WaitSetResponse should exist');

		// Cleanup
		await soap.makeSOAPEnvelopeAccount(
			`<DestroyWaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}"/>`, account1Token
		);
	});


	it('Sanity | Basic Test Case for WaitSetRequest on document 2', async () => {
		// Create waitset
		const createWS = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="d">
				<add>
					<a name="${account1Name}"/>
				</add>
			</CreateWaitSetRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createWS.Fault, 'Response should not be a Fault');
		assert.exists(createWS.CreateWaitSetResponse,
			'CreateWaitSetResponse should exist');
		const wsId = createWS.CreateWaitSetResponse.waitSet;
		const seq = createWS.CreateWaitSetResponse.seq;

		// Save doc
		const docName = 'doc.' + common.getUniqueString() + '.txt';

		// SaveDocumentRequest
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc name="${docName}" l="${briefcaseFolderId}">
					<content>Waitset delete test</content>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0]
			: saveRes.SaveDocumentResponse.doc;

		// Delete doc
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${doc.id}" op="delete"/>
			</ItemActionRequest>`, account1Token
		);

		// WaitSet
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}" seq="${seq}" block="0" timeout="5000"/>`, account1Token
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'Response should not be a Fault');
		assert.exists(waitRes.WaitSetResponse, 'WaitSetResponse should exist');

		// Cleanup
		await soap.makeSOAPEnvelopeAccount(
			`<DestroyWaitSetRequest xmlns="urn:zimbraMail" waitSet="${wsId}"/>`, account1Token
		);
	});
});
