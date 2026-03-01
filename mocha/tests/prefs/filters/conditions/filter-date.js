import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filter-Date', function () {
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
	it('Sanity | Create filter with date before test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="date${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/>
						</filterTests>
						<filterActions><actionKeep/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Date before test should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});


	it('Functional | Create filter with date after test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="date${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<dateTest dateComparison="after" d="${Math.floor(Date.now() / 1000) - 86400}"/>
						</filterTests>
						<filterActions><actionFlag flagName="flagged"/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Date after test should not fault');
	});
});
