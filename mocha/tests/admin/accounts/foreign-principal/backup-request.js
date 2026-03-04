import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > Foreign Principal > Backup Request', function () {
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
	it('Functional | Backup (full) and restore an account with a Foreign Principal. Verify the Foreign Principal value is backed up and restored', async () => {
		const accountName = 'fp' + common.getUniqueString() +
			'@' + config.testDomain;
		const foreignPrincipal = 'test:' + common.getUniqueString();

		// Create account with foreign principal
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${foreignPrincipal}</a>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const acct = Array.isArray(
			createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const acctId = acct.id;

		// Verify foreign principal via GetAccount
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const getAcct = Array.isArray(
			getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;

		// Verify response
		assert.equal(getAcct.id, acctId,
			'Should find account by foreign principal');

		// Login to create mailbox
		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

		// Search to verify account exists after login
		const searchRes = await soap.makeSOAPEnvelopeAdmin(
			`<SearchDirectoryRequest xmlns="urn:zimbraAdmin"
				attrs="zimbraForeignPrincipal">
				<query>(mail=*${accountName}*)</query>
			</SearchDirectoryRequest>`, adminAuth);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');

		// Verify foreign principal still accessible
		const getRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(getRes2.Fault, 'Response should not be a Fault');
	});


	it('Functional | Backup (incremental) and restore an account with a Foreign Principal. Verify the Foreign Principal value is backed up and restored', async () => {
		const accountName = 'fp' + common.getUniqueString() +
			'@' + config.testDomain;
		const foreignPrincipal = 'test:' + common.getUniqueString();

		// Create account without foreign principal
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const acct = Array.isArray(
			createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const acctId = acct.id;

		// Login to create mailbox
		// Auth request
		await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

		// Add foreign principal via ModifyAccount
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraForeignPrincipal">${foreignPrincipal}</a>
			</ModifyAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse.account,
			'ModifyAccountResponse should contain account');
		const modAcct = Array.isArray(
			modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;

		// Verify response
		assert.equal(modAcct.id, acctId,
			'Modified account id should match');

		// Search to verify foreign principal
		const searchRes = await soap.makeSOAPEnvelopeAdmin(
			`<SearchDirectoryRequest xmlns="urn:zimbraAdmin"
				attrs="zimbraForeignPrincipal">
				<query>(mail=*${accountName}*)</query>
			</SearchDirectoryRequest>`, adminAuth);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');

		// Verify foreign principal via GetAccount
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
			</GetAccountRequest>`, adminAuth);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
	});
});
