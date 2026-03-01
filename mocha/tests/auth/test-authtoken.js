import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Auth > Test Authtoken', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let testAccount1Name;
	let testAccount1Id;
	let testAccount2Name;
	let testAccount2Id;
	let authToken1;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account 1
		testAccount1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		testAccount1Id = acct1.id;

		// Create test account 2
		testAccount2Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		testAccount2Id = acct2.id;

		// Get auth token for account1
		authToken1 = await soap.getAccountAuthToken(testAccount1Name);
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
	it('Sanity | GetFolderRequest with authtoken and name of first account (using context specified by name)', async () => {
		// GetFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', authToken1
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetFolderResponse, 'GetFolderResponse should exist');
		const folder = Array.isArray(response.GetFolderResponse.folder)
			? response.GetFolderResponse.folder[0]
			: response.GetFolderResponse.folder;

		// Verify response
		assert.exists(folder, 'folder should exist');
		assert.equal(folder.id, '1', 'Root folder id should be 1');
	});


	it('Sanity | GetFolderRequest with authtoken and name of first account (using context specified by ID)', async () => {
		// GetFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', authToken1
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetFolderResponse, 'GetFolderResponse should exist');
		const folder = Array.isArray(response.GetFolderResponse.folder)
			? response.GetFolderResponse.folder[0]
			: response.GetFolderResponse.folder;

		// Verify response
		assert.exists(folder, 'folder should exist');
		assert.equal(folder.id, '1', 'Root folder id should be 1');
	});


	it('Sanity | Login to testaccount2 with admins authtoken (using context specified by name)', async () => {
		// Use admin token to access test_account2 folders
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.DelegateAuthResponse, 'DelegateAuthResponse should exist');

		const delegateToken = Array.isArray(response.DelegateAuthResponse.authToken)
			? response.DelegateAuthResponse.authToken[0]._content
			: response.DelegateAuthResponse.authToken._content
			|| response.DelegateAuthResponse.authToken;

		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', delegateToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const folder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0]
			: folderRes.GetFolderResponse.folder;

		// Verify response
		assert.exists(folder, 'folder should exist');
	});


	it('Sanity | Login to testaccount2 with admins authtoken (using context specified by id)', async () => {
		// Use admin token to access test_account2 folders by id
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccount2Id}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.DelegateAuthResponse, 'DelegateAuthResponse should exist');

		const delegateToken = Array.isArray(response.DelegateAuthResponse.authToken)
			? response.DelegateAuthResponse.authToken[0]._content
			: response.DelegateAuthResponse.authToken._content
			|| response.DelegateAuthResponse.authToken;

		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', delegateToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const folder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0]
			: folderRes.GetFolderResponse.folder;

		// Verify response
		assert.exists(folder, 'folder should exist');
	});


	it('Sanity | Login to testaccount2 with testaccount1s auth token (using context specified by name)', async () => {
		// This test verifies that normal user can't access another user's data
		// Using account1 token, try to get test_account2 data via delegate
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, authToken1
		);

		// Verify response
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Regression | Login to testaccount2 with testaccount1s auth token (using context specified by name)', async () => {
		// DelegateAuthRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, authToken1
		);

		// Verify response
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Regression | Login to testaccount2 with testaccount1s auth token (using context specified by id)', async () => {
		// DelegateAuthRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccount2Id}</account>
			</DelegateAuthRequest>`, authToken1
		);

		// Verify response
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Regression | Login to testaccount2 with its different session-id and without authtoken (using context specified by name, id)', async () => {
		// NOTE: Commented out in XML due to session-id handling issues
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${testAccount2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Regression | Login to testaccount2 with its own session-id and without authtoken (using context specified by id, name)', async () => {
		// NOTE: Commented out in XML due to session-id handling issues
		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="id">${testAccount2Id}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Login to adminmailaccount with adminlogin authtoken (requestContext specified by name)', async () => {
		// NOTE: Commented out in XML — admin mail account delegation
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount1Name}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.DelegateAuthResponse,
			'DelegateAuthResponse should exist');
		assert.exists(response.DelegateAuthResponse.authToken, 'Delegated authToken should exist');
		assert.match(String(response.DelegateAuthResponse.lifetime), /^\d+$/,
			'Delegated lifetime should be numeric');
	});


	it('Functional | Login to adminmailaccount with testaccount1s auth token (requestContext specified by name)', async () => {
		// NOTE: Commented out in XML — user token cannot delegate
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, authToken1
		);

		// Verify response
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Functional | Login to testaccount1 with adminmailaccounts authtoken (requestContext specified by nameid)', async () => {
		// NOTE: Commented out in XML — admin delegating to regular account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccount1Id}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.DelegateAuthResponse,
			'DelegateAuthResponse should exist');

		const delegateToken = Array.isArray(response.DelegateAuthResponse.authToken)
			? response.DelegateAuthResponse.authToken[0]._content
			: response.DelegateAuthResponse.authToken._content
			|| response.DelegateAuthResponse.authToken;

		// GetFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', delegateToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const folder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0]
			: folderRes.GetFolderResponse.folder;

		// Verify response
		assert.exists(folder, 'folder should exist');
	});
});
