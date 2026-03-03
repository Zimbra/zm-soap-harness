import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 50507', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Verify filter rule with modified From header', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0].id
			: createRes.CreateAccountResponse.account.id;

		// Set zimbraSmtpRestrictEnvelopeFrom via admin SOAP
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraSmtpRestrictEnvelopeFrom">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create filter rule
		const filterName = `Filter${common.getUniqueString()}`;
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="contains"
								value="modified"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="TagFiltered"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(filterRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Inject the MIME message with modified headers
		const filePath = path.join(
			config.projectRoot, 'mocha/data/bugs/50507/bug50507.txt'
		);
		await soap.injectMime(accountAuthToken, filePath);

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
