import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Bugs > Bug 95102', function () {
	this.timeout(30 * 1000);
	let adminAuthToken;
	let accountName;
	let accountServer;
	let domainName;
	const domainPreauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create domain with preauth key
		domainName = 'preauth.' + common.getUniqueString() + '.com';
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraPreAuthKey">${domainPreauthKey}</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.exists(domainRes.CreateDomainResponse, 'Should create domain');

		// Create account with maintenance status
		accountName = 'preauth' + common.getUniqueString() + '@' + domainName;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAccountStatus">maintenance</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.exists(createRes.CreateAccountResponse, 'Should create account');

		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		accountServer = host ? host._content : config.server;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | preAuthServlet has no checking against the accounts status', async () => {
		// Attempt to auth with account in maintenance mode - should get MAINTENANCE_MODE error
		const response = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountName}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, true, accountServer
		);
		if (response.Fault) {
			assert.include(response.Fault.Detail.Error.Code, 'account.MAINTENANCE_MODE',
				'Should return MAINTENANCE_MODE error');
		} else {
			assert.fail('Expected Fault for account in maintenance mode');
		}
	});
});
