import { assert } from 'chai';
import crypto from 'crypto';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Auth > Admin Preauth', function () {
	this.timeout(120 * 1000);
	let account1Email, account2Email, preauthKey, domainName;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		preauthKey = '7c9d4c4372457f2e9df0a681e31559e691199762171b832ec042861bc9b610ba';
		domainName = 'preauth' + common.getUniqueString() + '.com';

		// Create domain with preauth key
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraPreAuthKey">${preauthKey}</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'Response should not be a Fault');

		// Create global admin account
		account1Email = 'preauth' + common.getUniqueString() + '@' + domainName;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		// Create delegated admin account
		account2Email = 'preauth' + common.getUniqueString() + '@' + domainName;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Preauth request - basic test for global admin preauth', async () => {
		const timestamp = String(Date.now());
		const expires = '0';

		// Compute admin preauth HMAC: keys sorted alphabetically (account|admin|by|expires|timestamp)
		const data = `${account1Email}|1|name|${expires}|${timestamp}`;
		const hmac = crypto.createHmac('sha1', preauthKey).update(data).digest('hex');

		// Verify admin preauth works via SOAP
		const authRes = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Admin AuthRequest should not fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		// Verify preauth via REST /service/preauth endpoint with admin=1
		const adminPort = config.adminPort || 7071;
		const preauthUrl = `https://${config.serverHost}:${adminPort}`
			+ `/service/preauth?account=${encodeURIComponent(account1Email)}`
			+ `&by=name&timestamp=${timestamp}&expires=${expires}`
			+ `&admin=1&preauth=${hmac}`;

		const response = await fetch(preauthUrl, {
			method: 'GET',
			redirect: 'manual'
		});
		assert.oneOf(response.status, [200, 302],
			'Admin preauth REST request should return 200 or 302');
	});


	it('Sanity | Preauth request - basic test for domain admin preauth', async () => {
		const timestamp = String(Date.now());
		const expires = '0';

		// Compute admin preauth HMAC: keys sorted alphabetically (account|admin|by|expires|timestamp)
		const data = `${account2Email}|1|name|${expires}|${timestamp}`;
		const hmac = crypto.createHmac('sha1', preauthKey).update(data).digest('hex');

		// Verify delegated admin auth works
		const authRes = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Delegated admin AuthRequest should not fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');

		// Verify preauth via REST
		const adminPort = config.adminPort || 7071;
		const preauthUrl = `https://${config.serverHost}:${adminPort}`
			+ `/service/preauth?account=${encodeURIComponent(account2Email)}`
			+ `&by=name&timestamp=${timestamp}&expires=${expires}`
			+ `&admin=1&preauth=${hmac}`;

		const response = await fetch(preauthUrl, {
			method: 'GET',
			redirect: 'manual'
		});
		assert.oneOf(response.status, [200, 302],
			'Domain admin preauth REST request should return 200 or 302');
	});
});
