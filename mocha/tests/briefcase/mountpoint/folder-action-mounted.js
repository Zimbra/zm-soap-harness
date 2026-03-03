import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Mountpoint > Folder Action Mounted', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let account2Token;
	let account1Id;
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

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;
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
	it('Sanity | FolderActionRequest on a mounted briefcase folder - delete the mountpoint', async () => {
		// Get briefcase folder for account1
		const folderRes1 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const root1 = Array.isArray(folderRes1.GetFolderResponse.folder)
			? folderRes1.GetFolderResponse.folder[0] : folderRes1.GetFolderResponse.folder;
		const subfolders1 = Array.isArray(root1.folder) ? root1.folder : [root1.folder];
		const briefcase = subfolders1.find(f => f && f.name === 'Briefcase');
		const briefcaseFolderId = briefcase.id;

		// Share briefcase
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseFolderId}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Mount as account2
		const folderRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		const root2 = Array.isArray(folderRes2.GetFolderResponse.folder)
			? folderRes2.GetFolderResponse.folder[0] : folderRes2.GetFolderResponse.folder;

		// CreateMountpointRequest
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${root2.id}" name="MountedBC.${common.getUniqueString()}" rid="${briefcaseFolderId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.notExists(mountRes.Fault, 'Response should not be a Fault');
		const link = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0] : mountRes.CreateMountpointResponse.link;
		const mountId = link.id;

		// Delete the mountpoint
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${mountId}"/>
			</FolderActionRequest>`, account2Token
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(deleteRes.FolderActionResponse.action)
			? deleteRes.FolderActionResponse.action[0] : deleteRes.FolderActionResponse.action;
		assert.equal(folderAction.op, 'delete', 'op should be delete');
	});
});
