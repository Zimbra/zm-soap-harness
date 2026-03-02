import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Sieve > Sieve Bugs Legacy', function () {
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

	async function createAccountAndAuth() {
		const email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${email}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(email);
	}

	async function createFilterAndVerify(authToken, name, testsXml, actionsXml) {
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${name}_${common.getUniqueString()}" active="1"><filterTests condition="anyof">${testsXml}</filterTests><filterActions>${actionsXml}</filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, `${name} should not fault`);
		return modRes;
	}

	it('Regression | Bug28832-01 Filter with header test and keep', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_01', '<headerTest header="subject" stringComparison="contains" value="bug28832"/>', '<actionKeep/>'); });
	it('Regression | Bug28832-02 Header is comparison', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_02', '<headerTest header="subject" stringComparison="is" value="exact28832"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | Bug28832-03 Header matches comparison', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_03', '<headerTest header="subject" stringComparison="matches" value="*28832*"/>', '<actionKeep/>'); });
	it('Regression | Bug28832-04 From header filter', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_04', '<headerTest header="from" stringComparison="contains" value="sender28832"/>', '<actionDiscard/>'); });
	it('Regression | Bug28832-05 To header filter', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_05', '<headerTest header="to" stringComparison="is" value="to28832@test.com"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | Bug28832-06 Cc header filter', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_06', '<headerTest header="cc" stringComparison="contains" value="cc28832"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | Bug28832-07 Size test filter', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_07', '<sizeTest numberComparison="over" s="1M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | Bug28832-08 Body test filter', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_08', '<bodyTest value="body28832"/>', '<actionKeep/>'); });
	it('Regression | Bug28832-09 Allof condition filter', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug28832_09_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="28832"/><headerTest header="from" stringComparison="contains" value="sender"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | Bug28832-10 Verify via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug28832_10', '<headerTest header="subject" stringComparison="is" value="v28832"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); assert.exists(g.GetFilterRulesResponse); });

	it('Regression | Bug31446-01 Filter with multiple header conditions', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug31446_01', '<headerTest header="subject" stringComparison="contains" value="multi31446"/>', '<actionKeep/>'); });
	it('Regression | Bug31446-02 Header negative test', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug31446_02', '<headerTest header="subject" stringComparison="contains" negative="1" value="spam31446"/>', '<actionKeep/>'); });
	it('Regression | Bug31446-03 Size and header allof', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug31446_03_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="large"/><sizeTest numberComparison="over" s="5M"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | Bug31446-04 Header with tag action', async () => { const a = await createAccountAndAuth(); const t = `tag${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="3"/></CreateTagRequest>`, a); await createFilterAndVerify(a, 'bug31446_04', '<headerTest header="from" stringComparison="contains" value="vip"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | Bug31446-05 Multiple anyof conditions', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug31446_05_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="a"/><headerTest header="subject" stringComparison="is" value="b"/><headerTest header="subject" stringComparison="is" value="c"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | Bug31446-06 Redirect action', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug31446_06', '<headerTest header="subject" stringComparison="is" value="fwd31446"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | Bug31446-07 Multiple actions combo', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug31446_07', '<headerTest header="subject" stringComparison="contains" value="combo31446"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | Bug31446-08 Verify via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug31446_08', '<headerTest header="subject" stringComparison="is" value="v31446"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | Bug37679-01 Filter with envelope from', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug37679_01', '<envelopeTest header="from" stringComparison="is" value="env@test.com"/>', '<actionKeep/>'); });
	it('Regression | Bug37679-02 Envelope to', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug37679_02', '<envelopeTest header="to" stringComparison="contains" value="dest"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | Bug37679-03 Envelope matches', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug37679_03', '<envelopeTest header="from" stringComparison="matches" value="*@*.com"/>', '<actionDiscard/>'); });
	it('Regression | Bug37679-04 Envelope negative', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug37679_04', '<envelopeTest header="from" stringComparison="is" negative="1" value="no@test.com"/>', '<actionKeep/>'); });
	it('Regression | Bug37679-05 Verify envelope via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug37679_05', '<envelopeTest header="from" stringComparison="is" value="v@test.com"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | Bug71457-01 Filter with address test domain part', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_01', '<addressTest header="from" stringComparison="is" part="domain" value="example.com"/>', '<actionKeep/>'); });
	it('Regression | Bug71457-02 Address localpart', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_02', '<addressTest header="from" stringComparison="is" part="localpart" value="user"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | Bug71457-03 Address all part', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_03', '<addressTest header="to" stringComparison="is" part="all" value="user@example.com"/>', '<actionKeep/>'); });
	it('Regression | Bug71457-04 Address contains comparison', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_04', '<addressTest header="from" stringComparison="contains" value="admin"/>', '<actionDiscard/>'); });
	it('Regression | Bug71457-05 Address matches comparison', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_05', '<addressTest header="from" stringComparison="matches" value="*@corp.com"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | Bug71457-06 Address negative test', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_06', '<addressTest header="from" stringComparison="is" negative="1" value="spam@test.com"/>', '<actionKeep/>'); });
	it('Regression | Bug71457-07 Verify address via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug71457_07', '<addressTest header="from" stringComparison="is" value="v@test.com"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | Bug92309-01 Filter with addressIn test', async () => { const a = await createAccountAndAuth(); await createFilterAndVerify(a, 'bug92309_01', '<addressBookTest header="from"/>', '<actionKeep/>'); });
});
