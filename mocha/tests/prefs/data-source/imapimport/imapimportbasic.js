import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Data Source > Imapimport > Imapimportbasic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Functional | Create IMAP data source', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const dsName = `imap_${common.getUniqueString()}`;

		// Create a data source
		const res = await soap.makeSOAPEnvelopeAccount(`<CreateDataSourceRequest xmlns="urn:zimbraMail"><imap name="${dsName}" isEnabled="0" host="imap.test.com" port="143" connectionType="cleartext" username="user_${common.getUniqueString()}" password="test123" l="2"/></CreateDataSourceRequest>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
		assert.exists(res.CreateDataSourceResponse, 'Response should exist');
	});
});
