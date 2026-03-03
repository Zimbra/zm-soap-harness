import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Sharing > Sharing Inherit', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let account2Name;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		assert.exists(acct1.id, 'Account1 ID should exist');
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'Account1 zimbraMailHost should exist');

		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 ID should exist');
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'Account2 zimbraMailHost should exist');

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
	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate', async () => {
		const parentFolder = 'ParentInherit1.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});


	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate 1', async () => {
		const parentFolder = 'ParentInherit2.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="dom" d="${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});


	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate 2', async () => {
		const parentFolder = 'ParentInherit3.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});


	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate 3', async () => {
		const parentFolder = 'ParentInherit4.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="all" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});


	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate 4', async () => {
		const parentFolder = 'ParentInherit5.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// FolderActionRequest
		const grantPubRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="pub" perm="rwd"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantPubRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});


	it('Sanity | Verify that newly-created subfolders will automatically inherit granted rights as appropriate 5', async () => {
		const parentFolder = 'ParentInherit6.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${parentFolder}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="dom" d="${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// FolderActionRequest
		const grantAllRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="all" perm="rwd"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantAllRes.Fault, 'Response should not be a Fault');

		// CreateFolderRequest
		const childRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder.id}" name="ChildFolder.${common.getUniqueString()}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(childRes.Fault, 'Response should not be a Fault');
		assert.exists(childRes.CreateFolderResponse.folder[0].id, 'Child folder ID should exist');
	});
});
