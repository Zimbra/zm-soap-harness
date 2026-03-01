import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Briefcase > Sharing > Grantee > Grantee Dl', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Token;
	let dlName;
	let dlId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
		dlName = 'dl.' + common.getUniqueString() + '@' + config.testDomain;

		// CreateDistributionListRequest
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0]
			: dlRes.CreateDistributionListResponse.dl;

		dlId = dl.id;
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
	it('Sanity | Share a briefcase folder to a DL. Verify that DL users have access.', async () => {
		const folderName = 'DLShare.' + common.getUniqueString();

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
					<grant gt="grp" d="${dlName}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'Response should not be a Fault');
		assert.exists(shareRes.FolderActionResponse, 'FolderActionResponse should exist');
	});


	it('Sanity | Create a briefcase folder. GetFolderRequest to verify the settings', async () => {
		const folderName = 'DLUnshare.' + common.getUniqueString();

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
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folder.id}">
					<grant gt="grp" d="${dlName}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// FolderActionRequest
		const revokeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folder.id}" zid="${dlId}"/>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(revokeRes.Fault, 'Response should not be a Fault');
		assert.exists(revokeRes.FolderActionResponse,
			'FolderActionResponse should exist');
	});
});
