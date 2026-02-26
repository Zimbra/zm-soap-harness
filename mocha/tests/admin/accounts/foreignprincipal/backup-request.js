import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > ForeignPrincipal > Backup Request', function () {
	this.timeout(120 * 1000);
	let adminAuth;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

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
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse,
			'Should create account with foreign principal');
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
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'GetAccountResponse should exist');
		const getAcct = Array.isArray(
			getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;
		assert.equal(getAcct.id, acctId,
			'Should find account by foreign principal');

		// Login to create mailbox
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
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchDirectoryResponse,
			'SearchDirectoryResponse should exist');

		// Verify foreign principal still accessible
		const getRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
			</GetAccountRequest>`, adminAuth);
		assert.notExists(getRes2.Fault, 'Response should not be a Fault');
		assert.exists(getRes2.GetAccountResponse,
			'Should still find account by foreign principal');
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
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse,
			'Should create account');
		const acct = Array.isArray(
			createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const acctId = acct.id;

		// Login to create mailbox
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
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse,
			'ModifyAccountResponse should exist');
		const modAcct = Array.isArray(
			modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;
		assert.equal(modAcct.id, acctId,
			'Modified account id should match');

		// Search to verify foreign principal
		const searchRes = await soap.makeSOAPEnvelopeAdmin(
			`<SearchDirectoryRequest xmlns="urn:zimbraAdmin"
				attrs="zimbraForeignPrincipal">
				<query>(mail=*${accountName}*)</query>
			</SearchDirectoryRequest>`, adminAuth);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchDirectoryResponse,
			'SearchDirectoryResponse should exist');

		// Verify foreign principal via GetAccount
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
			</GetAccountRequest>`, adminAuth);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'Should find account by foreign principal');
	});
});
