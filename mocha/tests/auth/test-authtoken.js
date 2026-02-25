import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Auth > Test Authtoken', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let testAccount1Name;
	let testAccount1Id;
	let testAccount2Name;
	let testAccount2Id;
	let authToken1;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account 1
		testAccount1Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		testAccount1Id = acct1.id;

		// Create test account 2
		testAccount2Name = 'test.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${testAccount2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		testAccount2Id = acct2.id;

		// Get auth token for account1
		authToken1 = await soap.getAccountAuthToken(testAccount1Name);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | GetFolderRequest with authtoken and name of first account (using context specified by name)', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', authToken1
		);
		assert.exists(response.GetFolderResponse, 'GetFolderResponse should exist');

		const folder = response.GetFolderResponse.folder;
		assert.exists(folder, 'folder should exist');

		const fld = Array.isArray(folder) ? folder[0] : folder;
		assert.equal(fld.id, '1', 'Root folder id should be 1');
	});


	it('Sanity | GetFolderRequest with authtoken and name of first account (using context specified by ID)', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', authToken1
		);
		assert.exists(response.GetFolderResponse, 'GetFolderResponse should exist');

		const folder = response.GetFolderResponse.folder;
		assert.exists(folder, 'folder should exist');

		const fld = Array.isArray(folder) ? folder[0] : folder;
		assert.equal(fld.id, '1', 'Root folder id should be 1');
	});


	it('Sanity | Login to test_account2 with admins authtoken (using context specified by name)', async () => {
		// Use admin token to access test_account2 folders
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);
		assert.exists(response.DelegateAuthResponse, 'DelegateAuthResponse should exist');

		const delegateToken = Array.isArray(response.DelegateAuthResponse.authToken)
			? response.DelegateAuthResponse.authToken[0]._content
			: response.DelegateAuthResponse.authToken._content
			|| response.DelegateAuthResponse.authToken;

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', delegateToken
		);
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
	});


	it('Sanity | Login to test_account2 with admins authtoken (using context specified by id)', async () => {
		// Use admin token to access test_account2 folders by id
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccount2Id}</account>
			</DelegateAuthRequest>`, adminAuthToken
		);
		assert.exists(response.DelegateAuthResponse, 'DelegateAuthResponse should exist');

		const delegateToken = Array.isArray(response.DelegateAuthResponse.authToken)
			? response.DelegateAuthResponse.authToken[0]._content
			: response.DelegateAuthResponse.authToken._content
			|| response.DelegateAuthResponse.authToken;

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', delegateToken
		);
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
	});


	it('Sanity | Login to test_account2 with test_account1s auth token should be denied', async () => {
		// This test verifies that normal user can't access another user's data
		// Using account1 token, try to get test_account2 data via delegate
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, authToken1
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Regression | Login to test_account2 with test_account1s auth token (using context specified by name)', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${testAccount2Name}</account>
			</DelegateAuthRequest>`, authToken1
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});


	it('Regression | Login to test_account2 with test_account1s auth token (using context specified by id)', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<DelegateAuthRequest xmlns="urn:zimbraAdmin">
				<account by="id">${testAccount2Id}</account>
			</DelegateAuthRequest>`, authToken1
		);
		assert.exists(response.Fault, 'Should return Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Should return PERM_DENIED');
	});
});
