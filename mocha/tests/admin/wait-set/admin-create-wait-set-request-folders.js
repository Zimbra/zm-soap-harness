import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Wait Set > Admin Create Wait Set Request Folders', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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

	// Helper to create account and return { id, email, token }
	async function createTestAccount() {
		const email = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(res.CreateAccountResponse.account)
			? res.CreateAccountResponse.account[0] : res.CreateAccountResponse.account;
		const token = await soap.getAccountAuthToken(email);
		return { id: acct.id, email, token };
	}

	// Helper to create admin waitset with folders defType
	async function createFolderWaitSet(accountId) {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<AdminCreateWaitSetRequest xmlns="urn:zimbraAdmin" defTypes="f">
				<add>
					<a id="${accountId}"/>
				</add>
			</AdminCreateWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'AdminCreateWaitSetRequest should not fault');
		assert.exists(res.AdminCreateWaitSetResponse, 'AdminCreateWaitSetResponse should exist');
		return {
			waitSet: res.AdminCreateWaitSetResponse.waitSet,
			seq: res.AdminCreateWaitSetResponse.seq
		};
	}

	// Tests
	it('Sanity | AdminWaitSetRequest with defTypes f 1', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Create a folder to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="testfolder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Wait for notification
		await soap.waitFor(2000);

		// Check waitset for changes
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 2', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Rename a folder to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="rename_source${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Rename the folder
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="rename" name="renamed${common.getUniqueString()}"/>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(renameRes.Fault, 'FolderActionRequest rename should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 3', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Move a folder to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="move_source${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Create destination folder
		const destRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="dest${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(destRes.Fault, 'CreateFolderRequest dest should not fault');
		const destId = destRes.CreateFolderResponse.folder[0].id;

		// Move folder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="move" l="${destId}"/>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(moveRes.Fault, 'FolderActionRequest move should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 4', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Delete a folder to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="delete_target${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Delete the folder (move to trash)
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="trash"/>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(deleteRes.Fault, 'FolderActionRequest trash should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 5', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Change folder color to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="color_target${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Change folder color
		const colorRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="color" color="3"/>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(colorRes.Fault, 'FolderActionRequest color should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 6', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Grant access on folder to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="grant_target${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Grant public access
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest grant should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});


	it('Sanity | AdminWaitSetRequest with defTypes f 7', async () => {
		// Create account and waitset
		const account = await createTestAccount();
		const ws = await createFolderWaitSet(account.id);

		// Update folder URL to trigger folder notifications
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="url_target${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account.token
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Update folder with a flag change
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="update" f="#"/>
			</FolderActionRequest>`, account.token
		);
		assert.notExists(updateRes.Fault, 'FolderActionRequest update should not fault');

		// Wait and check waitset
		await soap.waitFor(2000);
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${ws.waitSet}" seq="${ws.seq}" defTypes="f">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
		assert.exists(waitRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');
	});
});
