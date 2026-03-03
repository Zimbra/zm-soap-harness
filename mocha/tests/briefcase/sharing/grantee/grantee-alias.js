import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Briefcase > Sharing > Grantee > Grantee Alias', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Token;
	let aliasName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		aliasName = 'alias.' + common.getUniqueString() + '@' + config.testDomain;

		// AddAccountAliasRequest
		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}
				</id>
				<alias>${aliasName}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
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
		const folderName = 'AliasShare.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;
		const account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		const alias2 = 'alias.' + common.getUniqueString() + '@' + config.testDomain;

		// AddAccountAliasRequest
		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2.id}
				</id>
				<alias>${alias2}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${alias2}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		const folderAction = Array.isArray(shareRes.FolderActionResponse.action)
			? shareRes.FolderActionResponse.action[0] : shareRes.FolderActionResponse.action;
		assert.equal(folderAction.op, 'grant', 'op should be grant');
	});


	it('Sanity | Create a briefcase folder. GetFolderRequest to verify the settings', async () => {
		const folderName = 'AliasUnshare.' + common.getUniqueString();

		// CreateFolderRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;
		const account3Name = 'acct3.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		const alias3 = 'alias.' + common.getUniqueString() + '@' + config.testDomain;

		// AddAccountAliasRequest
		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct3.id}
				</id>
				<alias>${alias3}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// FolderActionRequest
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${alias3}" perm="r"/>
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
		assert.equal(folderAction.op, '!grant', 'op should be !grant');
	});
});
