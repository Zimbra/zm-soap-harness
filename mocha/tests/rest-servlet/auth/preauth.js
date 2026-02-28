import { assert } from 'chai';
import crypto from 'crypto';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Auth > Preauth', function () {
	this.timeout(120 * 1000);
	let account1Email, preauthKey, domainName;

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

		// Verify response
		assert.notExists(domainRes.Fault, 'Response should not be a Fault');
		assert.exists(domainRes.CreateDomainResponse, 'Should create domain');

		// Create account in that domain
		account1Email = 'preauth' + common.getUniqueString() + '@' + domainName;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Preauth request - basic test by name', async () => {
		const timestamp = String(Date.now());
		const expires = '0';

		// Compute preauth HMAC: account + "|" + by + "|" + expires + "|" + timestamp
		const data = `${account1Email}|name|${expires}|${timestamp}`;
		const hmac = crypto.createHmac('sha1', preauthKey).update(data).digest('hex');

		// Verify preauth via SOAP AuthRequest
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Email}</account>
				<preauth timestamp="${timestamp}" expires="${expires}">${hmac}</preauth>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'AuthRequest with preauth should not fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Verify preauth via REST /service/preauth endpoint
		const preauthUrl = `https://${config.serverHost}:${config.clientPort || 443}`
			+ `/service/preauth?account=${encodeURIComponent(account1Email)}`
			+ `&by=name&timestamp=${timestamp}&expires=${expires}`
			+ `&preauth=${hmac}`;

		const response = await fetch(preauthUrl, {
			method: 'GET',
			redirect: 'manual'
		});
		// Preauth redirects (302) or returns 200 on success
		// Verify response
		assert.oneOf(response.status, [200, 302],
			'Preauth REST request should return 200 or 302');
	});
});
