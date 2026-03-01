import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('ApplyFilterRulesRequest-SharedFolder', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Apply filter rules with shared folder query', async () => {
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

		const filterName = `filter${common.getUniqueString()}`;

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="shared"/>
						</filterTests>
						<filterActions><actionKeep/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Apply filter rules
		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}"/>
				</filterRules>
				<query>in:inbox</query>
			</ApplyFilterRulesRequest>`, authToken
		);

		// Verify the response
		assert.notExists(applyRes.Fault, 'ApplyFilterRulesRequest should not fault');
		assert.exists(applyRes.ApplyFilterRulesResponse, 'ApplyFilterRulesResponse should exist');
	});


	it('Functional | Apply filter rules to sent folder', async () => {
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

		const filterName = `filter${common.getUniqueString()}`;

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="sent"/>
						</filterTests>
						<filterActions><actionFlag flagName="flagged"/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Apply filter rules
		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}"/>
				</filterRules>
				<query>in:sent</query>
			</ApplyFilterRulesRequest>`, authToken
		);

		// Verify the response
		assert.notExists(applyRes.Fault, 'ApplyFilterRulesRequest sent folder should not fault');
	});
});
