import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Briefcase > Sharing > Grantee > Grantee Guest', function () {
	this.timeout(60 * 1000);
	let account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

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
	it('Sanity | Share a briefcase folder to guest. Verify that the guest has access.', async () => {
		const folderName = 'GuestShare.' + common.getUniqueString();
		const guestEmail = 'guest.' + common.getUniqueString() + '@external.com';

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
					<grant gt="guest" d="${guestEmail}" perm="r" pw="${config.accountPassword}"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');
	});


	it('Sanity | Unshare a folder to guest. Verify that the guest no longer has access.', async () => {
		const folderName = 'GuestUnshare.' + common.getUniqueString();
		const guestEmail = 'guest.' + common.getUniqueString() + '@external.com';

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
					<grant gt="guest" d="${guestEmail}" perm="r" pw="${config.accountPassword}"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');

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
	});
});
