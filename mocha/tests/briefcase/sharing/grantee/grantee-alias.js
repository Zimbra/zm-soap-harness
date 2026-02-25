import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Briefcase > Sharing > Grantee > Grantee Alias', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Token;
	let aliasName;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		const account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		aliasName = 'alias.' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}
				</id>
				<alias>${aliasName}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Share a briefcase folder to alias. Verify that the alias has access', async () => {
		const folderName = 'AliasShare.' + common.getUniqueString();
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;
		const account2Name = 'acct2.' + common.getUniqueString() + '@' + config.testDomain;

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
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2.id}
				</id>
				<alias>${alias2}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="usr" d="${alias2}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(shareRes.FolderActionResponse, 'FolderActionResponse should exist');
	});


	it('Sanity | Unshare a briefcase folder to alias. Verify removal', async () => {
		const folderName = 'AliasUnshare.' + common.getUniqueString();
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}" view="document"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createRes.CreateFolderResponse.folder)
			? createRes.CreateFolderResponse.folder[0]
			: createRes.CreateFolderResponse.folder;
		const account3Name = 'acct3.' + common.getUniqueString() + '@' + config.testDomain;

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
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct3.id}
				</id>
				<alias>${alias3}
				</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

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
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folder.id}" zid="${zid}"/>
			</FolderActionRequest>`, account1Token
		);
		assert.exists(revokeRes.FolderActionResponse,
			'FolderActionResponse should exist');
	});
});
