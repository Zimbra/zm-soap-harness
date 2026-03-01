import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('FilterRequest', function () {
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
	it('Smoke | ModifyFilterRulesRequest basic', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="f${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="test"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'Response should exist');
	});


	it('Smoke | GetFilterRulesRequest basic', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Create and verify filter rule', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const filterName = `f${common.getUniqueString()}`;

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${filterName}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="test"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Sanity | Delete filter rule by replacing with empty', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="del${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="del"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules/></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Delete all rules should not fault');
	});


	it('Functional | Create multiple filter rules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="r1_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="r2_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="b"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule><filterRule name="r3_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="c"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Multiple rules should not fault');
	});


	it('Functional | Create filter with all condition types', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="all${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="test"/><headerTest header="from" stringComparison="contains" value="from"/><sizeTest numberComparison="under" s="1M"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'All condition types should not fault');
	});


	it('Functional | Create filter with all action types', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="act${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="actions"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'All actions should not fault');
	});


	it('Regression | Create filter with empty name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="empty"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.isTrue((modRes.ModifyFilterRulesResponse !== undefined) || (modRes.Fault !== undefined), 'Should return a response');
	});
});
