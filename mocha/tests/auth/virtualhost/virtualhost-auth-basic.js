import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Virtualhost > Virtualhost Auth Basic', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let domain1Name;
	let domain1VirtualName;
	let domain1Id;
	let account1User;
	let account1Name;
	let account1Password;
	let account1Server;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		domain1Name = 'domain.' + common.getUniqueString() + '.com';
		domain1VirtualName = 'virtual.' + domain1Name;
		account1User = 'user.' + common.getUniqueString();
		account1Name = account1User + '@' + domain1Name;
		account1Password = config.accountPassword + '1';

		// Create domain with virtual host
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraVirtualHostname">${domain1VirtualName}</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domRes.Fault, 'Response should not be a Fault');
		assert.exists(domRes.CreateDomainResponse, 'Should create domain');

		domain1Id = Array.isArray(domRes.CreateDomainResponse.domain)
			? domRes.CreateDomainResponse.domain[0].id
			: domRes.CreateDomainResponse.domain.id;

		// Create account1
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${account1Password}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account1');

		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		account1Server = host ? host._content : config.server;
	});

	after(async function () {
		// Cleanup: remove virtual host from domain
		try {
			adminAuthToken = await soap.getAdminAuthToken();
			await soap.makeSOAPEnvelopeAdmin(
				`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
					<id>${domain1Id}</id>
					<a n="zimbraVirtualHostname"></a>
				</ModifyDomainRequest>`, adminAuthToken
			);
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Login as the test account using the full email address', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${account1Password}</password>
				<virtualHost>${domain1VirtualName}</virtualHost>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});


	it('Sanity | Login as the test account using only the name part of the email address', async () => {
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1User}</account>
				<password>${account1Password}</password>
				<virtualHost>${domain1VirtualName}</virtualHost>
			</AuthRequest>`, null, true, account1Server
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AuthResponse, 'AuthResponse should exist');
		assert.exists(response.AuthResponse.lifetime, 'lifetime should exist');
		assert.match(String(response.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(response.AuthResponse.authToken, 'authToken should exist');
	});
});
