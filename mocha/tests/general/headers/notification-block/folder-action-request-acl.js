import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Notification Block > Folder Action Request ACL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account2Email;
	let account1AuthToken;
	let account2Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `account1${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `account2${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		account2Id = acct2.id;

		account1AuthToken = await soap.getAccountAuthToken(account1Email);
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
	it('Smoke | Verify the notification block is returned with ACL when granting a share', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const inboxId = inbox.id;

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${inboxId}" name="${folderName}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;

		// Perform folder action
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'FolderActionRequest grant should not fault');
		const folderAction = Array.isArray(grantRes.FolderActionResponse.action)
			? grantRes.FolderActionResponse.action[0] : grantRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Sanity | Verify the notification block is returned with ACL when revoking a share', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const inboxId = inbox.id;

		// Create a folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${inboxId}" name="${folderName}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;

		// Perform folder action
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Grant should not fault');

		// Perform folder action
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${account2Id}"/>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Revoke should not fault');
		const folderAction = Array.isArray(revokeRes.FolderActionResponse.action)
			? revokeRes.FolderActionResponse.action[0] : revokeRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});
});
