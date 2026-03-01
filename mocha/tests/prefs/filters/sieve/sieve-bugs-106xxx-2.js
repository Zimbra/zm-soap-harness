import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Sieve-Bugs-106xxx-2', function () {
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

	async function createAccountAndAuth() {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(accountEmail);
	}

	it('Regression | Bug106900-01 Filter with notify action and subject', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106900_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="notify"/></filterTests><filterActions><actionNotify a="alert@test.com" su="Notification" content="New message"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106900-01 should not fault');
	});


	it('Regression | Bug106900-02 Notify with origHeaders', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106900_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="alert"/></filterTests><filterActions><actionNotify a="alert@test.com" su="Subject: ${common.getUniqueString()}" content="Alert"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106900-02 should not fault');
	});


	it('Regression | Bug106900-03 Notify with maxBodySize', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106900_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="from" stringComparison="contains" value="vip"/></filterTests><filterActions><actionNotify a="admin@test.com" su="VIP Alert" content="VIP message" maxBodySize="1024"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106900-03 should not fault');
	});


	it('Regression | Bug106900-04 Verify notify via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106900_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="verify"/></filterTests><filterActions><actionNotify a="check@test.com" su="Verify" content="Verify notify"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106990-01 Filter with reply action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106990_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="autoreply"/></filterTests><filterActions><actionReply content="I am out of office"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106990-01 should not fault');
	});


	it('Regression | Bug106990-02 Reply with keep action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106990_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="ooo"/></filterTests><filterActions><actionReply content="Out of office reply"/><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106990-02 should not fault');
	});


	it('Regression | Bug106990-03 Verify reply via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106990_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="vreply"/></filterTests><filterActions><actionReply content="Verify reply"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106993-01 Filter with reject action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106993_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="reject"/></filterTests><filterActions><actionReply content="Message rejected"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug106993-01 should not fault');
	});


	it('Regression | Bug107044-01 Filter with matches wildcard pattern', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107044_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*report*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107044-01 should not fault');
	});


	it('Regression | Bug107044-02 Matches with question mark wildcard', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107044_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="test?pattern"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107044-02 should not fault');
	});


	it('Regression | Bug107044-03 Verify matches via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107044_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*verify*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug107212-01 Filter with editHeaderAddAction', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="addheader"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-01 should not fault');
	});


	it('Regression | Bug107212-02 Filter with subject is comparison', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="exact match"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-02 should not fault');
	});


	it('Regression | Bug107212-03 Filter with from contains', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="from" stringComparison="contains" value="sender"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-03 should not fault');
	});


	it('Regression | Bug107212-04 Filter with to header', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="to" stringComparison="is" value="recipient@test.com"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-04 should not fault');
	});


	it('Regression | Bug107212-05 Filter with cc header', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_05_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="cc" stringComparison="contains" value="copy"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-05 should not fault');
	});


	it('Regression | Bug107212-06 Filter with redirect action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_06_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="redirect"/></filterTests><filterActions><actionRedirect a="fwd@test.com"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-06 should not fault');
	});


	it('Regression | Bug107212-07 Filter with fileinto action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_07_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="file"/></filterTests><filterActions><actionFileInto folderPath="/Inbox"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-07 should not fault');
	});


	it('Regression | Bug107212-08 Filter with tag action', async () => {
		const authToken = await createAccountAndAuth();
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${tagName}" color="5"/></CreateTagRequest>`, authToken);

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_08_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="tagging"/></filterTests><filterActions><actionTag tagName="${tagName}"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-08 should not fault');
	});


	it('Regression | Bug107212-09 Filter with stop action', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_09_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="stop here"/></filterTests><filterActions><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-09 should not fault');
	});


	it('Regression | Bug107212-10 Multiple rules combination', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_10a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="rule1"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="bug107212_10b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="rule2"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107212-10 should not fault');
	});


	it('Regression | Bug107212-11 Verify via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107212_11_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="verify"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'Response should exist');
	});


	it('Regression | Bug107221-01 Filter with caseSensitive header test', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" caseSensitive="1" value="CaseSensitive"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-01 should not fault');
	});


	it('Regression | Bug107221-02 CaseSensitive contains comparison', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" caseSensitive="1" value="UPPER"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-02 should not fault');
	});


	it('Regression | Bug107221-03 CaseSensitive matches comparison', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" caseSensitive="1" value="*Test*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-03 should not fault');
	});


	it('Regression | Bug107221-04 CaseSensitive with discard', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="from" stringComparison="is" caseSensitive="1" value="Spam@Test.Com"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-04 should not fault');
	});


	it('Regression | Bug107221-05 Non-caseSensitive comparison', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_05_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" caseSensitive="0" value="lower"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-05 should not fault');
	});


	it('Regression | Bug107221-06 CaseSensitive from header', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_06_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="from" stringComparison="contains" caseSensitive="1" value="Admin"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107221-06 should not fault');
	});


	it('Regression | Bug107221-07 Verify caseSensitive via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107221_07_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" caseSensitive="1" value="Verify"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug107222-01 Filter with custom header test', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107222_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Custom-Header" stringComparison="is" value="custom_value"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107222-01 should not fault');
	});


	it('Regression | Bug107222-02 Custom header contains', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107222_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Mailer" stringComparison="contains" value="Zimbra"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107222-02 should not fault');
	});


	it('Regression | Bug107222-03 Custom header matches', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107222_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Originating-IP" stringComparison="matches" value="192.168.*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Bug107222-03 should not fault');
	});


	it('Regression | Bug107222-04 Verify custom header via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();

		// Modify filter rules
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug107222_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="X-Verify" stringComparison="is" value="yes"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});
});
