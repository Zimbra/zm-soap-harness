import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filters-Tag', function () {
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

	it('Smoke | Create filter rule with tag action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const tagName = `tag${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="tagme"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tagName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});

	it('Sanity | Verify tag filter via GetFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const tagName = `tag${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="from" stringComparison="contains" value="test"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tagName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
	});

	it('Functional | Create tag filter with multiple conditions', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const tagName = `tag${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="allof">
							<headerTest header="subject" stringComparison="contains" value="important"/>
							<headerTest header="from" stringComparison="contains" value="boss"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tagName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest allof should not fault');
	});

	it('Functional | Create tag filter with inactive status', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const tagName = `tag${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="inactive"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tagName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest inactive should not fault');
	});
});
