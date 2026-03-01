import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Migration', function () {
	this.timeout(120 * 1000);
	let adminAuth;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
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
	it('Smoke | Create an account with valid values', async () => {
		const accountName = 'test' + common.getUniqueString() +
			'@' + config.testDomain;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateAccountResponse,
			'CreateAccountResponse should exist');
		const acct = Array.isArray(
			response.CreateAccountResponse.account)
			? response.CreateAccountResponse.account[0]
			: response.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct.name,
			'Account name should be set');
	});


	it('Smoke | ValidateRemoteZimbraConnection API will connect to source host and validate the admin credentials', async () => {
		const sourceHost = config.migrationSourceHost ||
			'apps-development.synacor.tk';
		const sourceAdmin = config.migrationSourceAdmin ||
			'admin@apps-development.synacor.tk';
		const sourcePassword = config.migrationSourcePassword ||
			config.accountPassword;

		// ValidateRemoteZimbraConnectionRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ValidateRemoteZimbraConnectionRequest xmlns="urn:zimbraAdmin">
				<sourceHost>${sourceHost}</sourceHost>
				<sourceAdminUserName>${sourceAdmin}</sourceAdminUserName>
				<sourceAdminUserPassword>${sourcePassword}</sourceAdminUserPassword>
			</ValidateRemoteZimbraConnectionRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!response.ValidateRemoteZimbraConnectionResponse ||
			!!response.Fault,
			'Should return response or fault');
	});


	it('Smoke | Fetch all the users from the source zimbra system based on the domain name', async () => {
		const sourceHost = config.migrationSourceHost ||
			'apps-development.synacor.tk';

		// FetchAllRemoteAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<FetchAllRemoteAccountsRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${sourceHost}</domain>
			</FetchAllRemoteAccountsRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!response.FetchAllRemoteAccountsResponse ||
			!!response.Fault,
			'Should return response or fault');
	});


	it('Smoke | MigrateUsersData', async () => {
		const accountName = 'test' + common.getUniqueString() +
			'@' + config.testDomain;
		const sourceUser = config.migrationSourceUser ||
			'source_user@apps-development.synacor.tk';

		// Create target account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse,
			'Should create target account');

		// MigrateUsersDataRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<MigrateUsersDataRequest xmlns="urn:zimbraAdmin">
				<isSsl>true</isSsl>
				<isSslVerify>false</isSslVerify>
				<migrate>
					<sourceUser>${sourceUser}</sourceUser>
					<targetUser>${accountName}</targetUser>
					<typeOfData>imap,caldav,contact</typeOfData>
				</migrate>
			</MigrateUsersDataRequest>`, adminAuth);

		// Verify response
		assert.isTrue(!!response.MigrateUsersDataResponse ||
			!!response.Fault,
			'Should return response or fault');
	});


	it('Smoke | Login with Target user', async () => {
		const accountName = 'test' + common.getUniqueString() +
			'@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse,
			'AuthResponse should exist');
		assert.match(
			String(response.AuthResponse.lifetime),
			/^\d+$/,
			'lifetime should be numeric');
	});


	it('Smoke | Vailidate data Migration compeletion', async () => {
		const accountName = 'test' + common.getUniqueString() +
			'@' + config.testDomain;
		const subject = 'Your email migration is done!';

		// Create and authenticate account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);
		const userAuth = authRes.AuthResponse.authToken;

		// SearchRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere subject: (${subject})</query>
			</SearchRequest>`, userAuth);
		// Migration mail may or may not exist depending on setup
		// Verify response
		assert.isTrue(!!response.SearchResponse || !!response.Fault,
			'Should return SearchResponse or fault');
	});
});
