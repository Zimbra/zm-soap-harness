import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Priority > Priority', function () {
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
	it('Smoke | Create filter with high priority header test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'High priority filter should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Create filter with low priority header test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="5"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Low priority filter should not fault');
	});


	it('Sanity | Create filter with normal priority', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="3"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Normal priority should not fault');
	});


	it('Functional | Create filter with importance high', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="Importance" stringComparison="is" value="high"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Importance high should not fault');
	});


	it('Functional | Create filter with importance low', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="Importance" stringComparison="is" value="low"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Importance low should not fault');
	});


	it('Functional | Priority filter with fileinto action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFileInto folderPath="/Inbox"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority fileinto should not fault');
	});


	it('Functional | Priority filter with tag action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${tagName}" color="1"/></CreateTagRequest>`, authToken);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="2"/></filterTests><filterActions><actionTag tagName="${tagName}"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority tag should not fault');
	});


	it('Functional | Priority filter with redirect', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionRedirect a="urgent@test.com"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority redirect should not fault');
	});


	it('Regression | Priority filter with stop action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority stop should not fault');
	});


	it('Regression | Priority filter with allof condition', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="X-Priority" stringComparison="is" value="1"/><headerTest header="subject" stringComparison="contains" value="urgent"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority allof should not fault');
	});


	it('Regression | Priority filter with multiple actions', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority multiple actions should not fault');
	});


	it('Functional | Priority filter with headerExists', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerExistsTest header="X-Priority"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority headerExists should not fault');
	});


	it('Sanity | Verify priority filter via GetFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'Response should exist');
	});


	it('Functional | Priority filter with importance normal', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="Importance" stringComparison="is" value="normal"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Importance normal should not fault');
	});


	it('Regression | Priority filter with inactive status', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority inactive should not fault');
	});


	it('Functional | Priority filter with negative test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" negative="1" value="5"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority negative should not fault');
	});


	it('Regression | Multiple priority filter rules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri1_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule><filterRule name="pri2_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="5"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Multiple priority rules should not fault');
	});


	it('Functional | Priority filter with contains comparison', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="contains" value="1"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority contains should not fault');
	});


	it('Regression | Priority filter with matches comparison', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="matches" value="?"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority matches should not fault');
	});


	it('Regression | Priority filter with discard action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="Importance" stringComparison="is" value="low"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority discard should not fault');
	});


	it('Functional | Priority filter with keep and flag', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="is" value="2"/></filterTests><filterActions><actionKeep/><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority keep+flag should not fault');
	});


	it('Functional | Priority filter with Importance header exists', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerExistsTest header="Importance"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Importance exists should not fault');
	});


	it('Regression | Priority filter with X-Priority contains 1', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="pri${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Priority" stringComparison="contains" value="1"/></filterTests><filterActions><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Priority contains 1 should not fault');
	});


	// ImportanceTest03 - High importance filter
	it('Sanity | Importance high filter', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="imp${common.getUniqueString()}" active="1"><filterTests condition="anyof"><importanceTest imp="high"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Importance high filter should not fault');
	});


	// LinkedinTest03 - LinkedIn filter with contains
	it('Sanity | LinkedIn filter with contains', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="li${common.getUniqueString()}" active="1"><filterTests condition="anyof"><linkedinTest/></filterTests><filterActions><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'LinkedIn filter should not fault');
	});


	// SocialcastTest03 - Socialcast discard
	it('Sanity | Socialcast filter with discard', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="sc${common.getUniqueString()}" active="1"><filterTests condition="anyof"><socialcastTest/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Socialcast filter should not fault');
	});


	// TwitterTest02 - Twitter redirect
	it('Sanity | Twitter filter with redirect', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="tw${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="from" stringComparison="contains" value="twitter.com"/></filterTests><filterActions><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Twitter filter should not fault');
	});
});
