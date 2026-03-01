import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filter-Subject', function () {
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
	it('Smoke | Create filter with subject is test', async () => {
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
					<filterRule name="subj${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="exact match"/>
						</filterTests>
						<filterActions><actionKeep/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Subject is test should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});


	it('Sanity | Create filter with subject contains test', async () => {
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
					<filterRule name="subj${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="promo"/>
						</filterTests>
						<filterActions><actionDiscard/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Subject contains test should not fault');
	});


	it('Functional | Create filter with subject matches wildcard', async () => {
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
					<filterRule name="subj${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="matches" value="*URGENT*"/>
						</filterTests>
						<filterActions><actionFlag flagName="flagged"/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Subject matches wildcard should not fault');
	});
});
