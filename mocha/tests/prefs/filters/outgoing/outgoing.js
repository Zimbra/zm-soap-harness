import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filters-Outgoing', function () {
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
	it('Smoke | Create outgoing filter rule', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="outgoing"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyOutgoingFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyOutgoingFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Verify outgoing filter via GetOutgoingFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="to" stringComparison="contains" value="external"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Get outgoing filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetOutgoingFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetOutgoingFilterRulesRequest should not fault');
		assert.exists(getRes.GetOutgoingFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Create outgoing filter with fileinto action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="file"/></filterTests><filterActions><actionFileInto folderPath="/Inbox"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing fileinto should not fault');
	});


	it('Functional | Create outgoing filter with tag action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${tagName}" color="1"/></CreateTagRequest>`, authToken);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="tag"/></filterTests><filterActions><actionTag tagName="${tagName}"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing tag should not fault');
	});


	it('Functional | Create outgoing filter with redirect', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="to" stringComparison="is" value="redir@test.com"/></filterTests><filterActions><actionRedirect a="copy@test.com"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing redirect should not fault');
	});


	it('Functional | Create outgoing filter with discard', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="discard"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing discard should not fault');
	});


	it('Functional | Create outgoing filter with flag and stop', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="urgent"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionStop/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing flag+stop should not fault');
	});


	it('Regression | Create outgoing filter with allof condition', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="report"/><headerTest header="to" stringComparison="contains" value="boss"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing allof should not fault');
	});


	it('Regression | Create multiple outgoing filter rules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out1_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="out2_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="b"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Multiple outgoing rules should not fault');
	});


	it('Regression | Create outgoing filter with body test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><bodyTest value="confidential"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing body test should not fault');
	});


	it('Functional | Create outgoing filter with size test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="over" s="5M"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing size test should not fault');
	});


	it('Functional | Create outgoing filter with attachment test', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><attachmentTest/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing attachment test should not fault');
	});


	it('Sanity | Create outgoing filter with inactive status', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="inactive"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing inactive should not fault');
	});


	it('Functional | Create outgoing filter with header exists', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerExistsTest header="X-Custom"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Outgoing header exists should not fault');
	});


	it('Regression | Apply outgoing filter rules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Modify outgoing filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="apply"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Send apply outgoing filter rules request
		const applyRes = await soap.makeSOAPEnvelopeAccount(`<ApplyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="out${common.getUniqueString()}"/></filterRules><query>in:sent</query></ApplyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.isTrue((applyRes.ApplyOutgoingFilterRulesResponse !== undefined) || (applyRes.Fault !== undefined), 'Should return a proper response');
	});

	// Outgoing-Filter-AddMsgRequest02 - Apply outgoing filter with AddMsg
	it('Sanity | Apply outgoing filter via AddMsgRequest', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const ruleName = `out_${common.getUniqueString()}`;

		// Modify outgoing filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${ruleName}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="outgoing_addmsg"/></filterTests><filterActions><actionTag tagName="outgoing_tagged"/><actionStop/></filterActions></filterRule></filterRules></ModifyOutgoingFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyOutgoingFilterRules should not fault');
	});
});
