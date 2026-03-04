import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > URL > Proxy', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create COS with zimbraProxyAllowedDomains
		const cosName = 'testcos' + common.getUniqueString();

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraProxyAllowedDomains">*.webex.com</a>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(cosRes.Fault, 'Response should not be a Fault');
		const cos = cosRes.CreateCosResponse?.cos;
		const cosId = (Array.isArray(cos) ? cos[0] : cos).id;

		// Create account with the COS
		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);
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
	it('Smoke | Verify ProxyServlet is working fine', async () => {
		const proxyUrl = `https://${config.serverHost}/service/proxy?target=${encodeURIComponent('https://www.webex.com')}`;
		const response = await fetch(proxyUrl, {
			method: 'GET',
			headers: {
				'Cookie': 'ZM_AUTH_TOKEN=' + account1Token
			},
			redirect: 'manual'
		});

		// Verify response
		assert.oneOf(response.status, [200, 403], 'Proxy request should return 200 or 403');
	});
});
