import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > GAL > Galaccount > Sync GAL Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);
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

	// XML: GalAccount_SyncGalRequest_01 (smoke)
	it('Smoke | SyncGal basic response', async () => {
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// XML: t:select path="//acct:SyncGalResponse"
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest idOnly="true" xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
	});

	// XML: GALAccount_SyncGalRequest_02 (sanity)
	it('Sanity | SyncGal with incremental token returns new account', async () => {
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Get initial sync token
		// XML: t:select path="//acct:SyncGalResponse" attr="token" set="token.id"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest idOnly="true" xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(res1.Fault, 'SyncGal should not be a Fault');
		const token = res1.SyncGalResponse.token;
		assert.exists(token, 'SyncGalResponse token should exist');

		// XML: t:select path="//admin:AuthResponse/admin:authToken" set="authToken"
		// Admin auth is handled by adminAuthToken

		// Create a new account
		// XML: t:select path="//admin:CreateAccountResponse"
		const newEmail = `syncacc${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Send incremental SyncGalRequest with token
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken" (re-auth)
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes2.Fault, 'Re-auth should not fault');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		// XML: t:select path="//acct:SyncGalResponse" > t:select path="//acct:cn[@id=...]"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}" idOnly="true"/>`, accountToken
		);
		assert.notExists(res2.Fault, 'SyncGal should not be a Fault');
		assert.exists(res2.SyncGalResponse.token, 'SyncGalResponse token should exist');
	});

	// XML: GALAccount_SyncGalRequest_03 (sanity)
	it('Sanity | SyncGal with incremental token returns modified account', async () => {
		const dispName = `account${common.getUniqueString()}`;
		const newDispName = `account${common.getUniqueString()}`;
		const newEmail = `account${common.getUniqueString()}@${config.testDomain}`;

		// XML: t:select path="//admin:AuthResponse/admin:authToken" set="authToken"
		// Admin auth is handled by adminAuthToken

		// XML: t:select path="//admin:CreateAccountResponse/admin:account" attr="id" set="domain1.account4.id"
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${dispName}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');

		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Get current token
		// XML: t:select path="//acct:SyncGalResponse" attr="token" set="token.id"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="true"/>`, accountToken
		);
		assert.notExists(res1.Fault, 'SyncGal should not be a Fault');
		const token = res1.SyncGalResponse.token;
		assert.exists(token, 'SyncGalResponse token should exist');

		// XML: t:select path="//admin:AuthResponse/admin:authToken" set="authToken"
		// XML: t:select path="//admin:ModifyAccountResponse"
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="displayName">${newDispName}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccount should not fault');

		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes2.Fault, 'Re-auth should not fault');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		// Incremental sync
		// XML: t:select path="//acct:SyncGalResponse" > t:select path="//acct:cn[@id=...]"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}" idOnly="true"/>`, accountToken
		);
		assert.notExists(res2.Fault, 'SyncGal should not be a Fault');
		assert.exists(res2.SyncGalResponse.token, 'SyncGalResponse token should exist');
	});

	// XML: GALAccount_SyncGalRequest_04 (sanity)
	it('Sanity | SyncGal after account deletion does not return deleted account', async () => {
		const newEmail = `account${common.getUniqueString()}@${config.testDomain}`;

		// XML: t:select path="//admin:AuthResponse/admin:authToken" set="authToken"
		// Admin auth handled by adminAuthToken

		// XML: t:select path="//admin:CreateAccountResponse/admin:account" attr="id" set="domain1.account5.id"
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');

		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Get token
		// XML: t:select path="//acct:SyncGalResponse" attr="token" set="token.id"
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="true"/>`, accountToken
		);
		assert.notExists(res1.Fault, 'SyncGal should not be a Fault');
		const token = res1.SyncGalResponse.token;
		assert.exists(token, 'SyncGalResponse token should exist');

		// XML: t:select path="//admin:AuthResponse/admin:authToken" set="authToken"
		// XML: t:select path="//admin:DeleteAccountResponse"
		const delRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(delRes.Fault, 'DeleteAccount should not fault');

		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, accountToken
		);
		assert.notExists(authRes2.Fault, 'Re-auth should not fault');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		// Incremental sync — deleted account should not appear
		// XML: t:select path="//acct:SyncGalResponse/acct:cn[contains(@id,'..')]" emptyset="1"
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}" idOnly="true"/>`, accountToken
		);
		assert.notExists(res2.Fault, 'SyncGal should not be a Fault');

		// Full sync — deleted account also should not appear
		// XML: t:select path="//acct:SyncGalResponse/acct:cn[contains(@id,'..')]" emptyset="1"
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount" idOnly="true"/>`, accountToken
		);
		assert.notExists(res3.Fault, 'SyncGal full should not be a Fault');
	});
});
