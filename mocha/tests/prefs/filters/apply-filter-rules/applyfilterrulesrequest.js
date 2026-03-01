import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('ApplyFilterRulesRequest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Functional | Apply multiple filter rules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filter1 = `filter1_${common.getUniqueString()}`;
		const filter2 = `filter2_${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filter1}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="a"/>
						</filterTests>
						<filterActions><actionKeep/></filterActions>
					</filterRule>
					<filterRule name="${filter2}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="b"/>
						</filterTests>
						<filterActions><actionFlag flagName="flagged"/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filter1}"/>
				</filterRules>
				<query>in:inbox</query>
			</ApplyFilterRulesRequest>`, authToken
		);
		assert.notExists(applyRes.Fault, 'ApplyFilterRulesRequest should not fault');
	});

	it('Functional | Apply non-existent filter rule', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="nonexistent_${common.getUniqueString()}"/>
				</filterRules>
			</ApplyFilterRulesRequest>`, authToken
		);
		assert.exists(applyRes.Fault, 'Apply non-existent filter should fault');
	});
});
