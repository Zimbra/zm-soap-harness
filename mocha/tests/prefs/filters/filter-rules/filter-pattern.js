import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('FilterRules-Operators-Pattern', function () {
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

	it('Sanity | Create filter with is comparison operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="exact"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Is operator should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'Response should exist');
	});

	it('Sanity | Create filter with contains comparison operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="partial"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Contains operator should not fault');
	});

	it('Functional | Create filter with matches comparison operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*wild?card*"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Matches operator should not fault');
	});

	it('Functional | Verify filter operators via GetFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="verify"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
	});

	it('Functional | Create filter with not contains operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" negative="1" value="spam"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Not contains should not fault');
	});

	it('Regression | Create filter with not is operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" negative="1" value="donotmatch"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Not is should not fault');
	});
});
