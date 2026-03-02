import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Briefcase > Sharing > Grantee > Grantee User', function () {
	this.timeout(60 * 1000);
	let account1Token;
	let account2Name;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
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
	it('Sanity | Share a briefcase folder to an alias. Verify that the account has access.', async () => {
		const folderName = 'UserShare.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Sanity | Unshare a briefcase folder to an account. Verify that the account no longer has access.', async () => {
		const folderName = 'UserUnshare.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		const zid = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0].zid
			: shareRes.FolderActionResponse.action.zid;

		// FolderActionRequest
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folder.id}" zid="${zid}"/>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(revokeRes.FolderActionResponse.action)
			? revokeRes.FolderActionResponse.action[0] : revokeRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});
});
