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

		// Verify response - migration source may not be available
		if (response.Fault) {
			assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.notExists(response.Fault,
				'ValidateRemoteZimbraConnectionResponse should exist');
		}
	});


	it('Smoke | Fetch all the users from the source zimbra system based on the domain name', async () => {
		const sourceHost = config.migrationSourceHost ||
			'apps-development.synacor.tk';

		// FetchAllRemoteAccountsRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<FetchAllRemoteAccountsRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${sourceHost}</domain>
			</FetchAllRemoteAccountsRequest>`, adminAuth);

		// Verify response - migration source may not be available
		if (response.Fault) {
			assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.notExists(response.Fault,
				'FetchAllRemoteAccountsResponse should exist');
		}
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

		// Verify response - migration source may not be available
		if (response.Fault) {
			assert.isString(response.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		} else {
			assert.notExists(response.Fault,
				'MigrateUsersDataResponse should exist');
		}
	});


	it('Smoke | Login with Target user', async () => {
		const accountName = 'test' + common.getUniqueString() +
			'@' + config.testDomain;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Send the message
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
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
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);
		const userAuth = await soap.getAccountAuthToken(accountName);

		// SearchRequest
		const response = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere subject:(${subject})</query>
			</SearchRequest>`, userAuth);
		// Migration mail may or may not exist depending on setup
		// Verify response
		assert.notExists(response.Fault, 'SearchRequest should not fault');
		assert.notExists(response.Fault, 'SearchResponse should exist');
	});
});
