import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import server from '../../framework/backend/server-command.js';

describe('Auth > Auth Alias', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Alias;
	let account1Server;
	let account2NameUser;
	let account2Name;
	let account2AliasUser;
	let account2Alias;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'account1.' + common.getUniqueString() + '@' + config.testDomain;
		account1Alias = 'account1.alias1.' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const acct1Id = acct1.id;
		const host1 = acct1.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host1 ? host1._content : config.server;

		// Add alias for account1
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct1Id}</id>
				<alias>${account1Alias}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Create account2
		account2NameUser = 'account2.' + common.getUniqueString();
		account2Name = account2NameUser + '@' + config.testDomain;
		account2AliasUser = 'alias2.' + common.getUniqueString();
		account2Alias = account2AliasUser + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		const acct2Id = acct2.id;

		// Add alias for account2
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct2Id}</id>
				<alias>${account2Alias}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
	});

	// Tests
	if (config.serial !== true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Smoke | AuthRequest - log in with alias', async () => {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${account1Alias}</account>
					<password>${config.accountPassword}</password>
				</AuthRequest>`, null
			);
			assert.notExists(response.Fault, 'Response should not be a Fault');
			assert.exists(response.AuthResponse, 'AuthResponse should exist');
			assert.exists(response.AuthResponse.authToken, 'authToken should exist');
		});
	}


	if (config.serial !== true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Sanity | AuthRequest - verify failed login with alias name does not show real account name', async () => {
			const response = await soap.makeSOAPEnvelopeAccount(
				`<AuthRequest xmlns="urn:zimbraAccount">
					<account by="name">${account2AliasUser}</account>
					<password>wrong password</password>
				</AuthRequest>`, null
			);
			assert.exists(response.Fault, 'Should return Fault');
			assert.include(response.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
				'Should return AUTH_FAILED');
			// Verify real account name is NOT in the error trace
			const faultText = JSON.stringify(response.Fault);
			assert.notInclude(faultText, account2NameUser,
				'Real account name should not appear in error');
		});
	}


	// Serial tests
	if (config.serial === true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Verify below points when "alias_login_enabled" local config value is set to false - 1. Alias login will blocked 2. Login with email address would work.', async function () {
			this.timeout(120 * 1000);

			// Set alias_login_enabled to false
			await server.runCommand('sudo su - zimbra -c \'zmlocalconfig -e alias_login_enabled=false\'');
			await server.runCommand('sudo su - zimbra -c \'zmmailboxdctl restart\'');
			await new Promise(resolve => setTimeout(resolve, 10000));

			try {
				// Attempt alias login - should fail with AUTH_FAILED
				const aliasRes = await soap.makeSOAPEnvelopeAccount(
					`<AuthRequest xmlns="urn:zimbraAccount">
						<account by="name">${account1Alias}</account>
						<password>${config.accountPassword}</password>
					</AuthRequest>`, null, true, account1Server
				);
				assert.exists(aliasRes.Fault, 'Should return Fault for alias login when disabled');
				assert.include(aliasRes.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
					'Should return AUTH_FAILED for alias login');

				// Regular account login should still work
				const acctRes = await soap.makeSOAPEnvelopeAccount(
					`<AuthRequest xmlns="urn:zimbraAccount">
						<account by="name">${account1Name}</account>
						<password>${config.accountPassword}</password>
					</AuthRequest>`, null, true, account1Server
				);
				assert.notExists(acctRes.Fault, 'Response should not be a Fault');
				assert.exists(acctRes.AuthResponse, 'AuthResponse should exist for regular login');
				assert.match(String(acctRes.AuthResponse.lifetime), /^\d+$/,
					'lifetime should be numeric');
				assert.exists(acctRes.AuthResponse.authToken, 'authToken should exist');

			} finally {
				await server.runCommand('sudo su - zimbra -c \'zmlocalconfig -e alias_login_enabled=true\'');
				await server.runCommand('sudo su - zimbra -c \'zmmailboxdctl restart\'');
			}
		});
	}
});
