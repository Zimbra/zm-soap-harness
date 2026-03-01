import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filters-Stop', function () {
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

	it('Sanity | Create filter rule with stop action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="stopme"/>
						</filterTests>
						<filterActions>
							<actionKeep/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});

	it('Functional | Create multiple rules with stop on first', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="rule1_${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="stop"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
					<filterRule name="rule2_${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="stop"/>
						</filterTests>
						<filterActions>
							<actionDiscard/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest multiple rules should not fault');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});
});
