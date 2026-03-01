import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filters-Operators', function () {
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
	it('Smoke | Create filter with is operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="test"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Is operator should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Create filter with not is operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" negative="1" value="test"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Not is should not fault');
	});


	it('Sanity | Create filter with contains operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="partial"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Contains should not fault');
	});


	it('Functional | Create filter with not contains operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" negative="1" value="spam"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Not contains should not fault');
	});


	it('Functional | Create filter with matches wildcard operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*test*"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Matches should not fault');
	});


	it('Functional | Create filter with not matches operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" negative="1" value="*spam*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Not matches should not fault');
	});


	it('Regression | Create filter with size under operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="under" s="100K"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Size under should not fault');
	});


	it('Regression | Create filter with size over operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="over" s="10M"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Size over should not fault');
	});


	it('Functional | Create filter with date before operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Date before should not fault');
	});


	it('Functional | Create filter with date after operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="after" d="${Math.floor(Date.now() / 1000) - 86400}"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Date after should not fault');
	});


	it('Regression | Create filter with header exists operator', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerExistsTest header="X-Custom-Header"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Header exists should not fault');
	});


	it('Regression | Verify operators via GetFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="op${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="verify"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
	});
});
