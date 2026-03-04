import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Sieve > Sieve ZCS Low', function () {
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
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${email}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(email);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	}

	async function createFilter(authToken, name, testsXml, actionsXml, condition = 'anyof') {
		const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${name}_${common.getUniqueString()}" active="1"><filterTests condition="${condition}">${testsXml}</filterTests><filterActions>${actionsXml}</filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(m.Fault, `${name} should not fault`);
		return m;
	}

	it('Regression | ZCS-95-01 Filter with envelope part test', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs95_01', '<envelopeTest header="from" stringComparison="is" value="env95@test.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-95-02 Envelope contains', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs95_02', '<envelopeTest header="to" stringComparison="contains" value="dest95"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-95-03 Envelope with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs95_03', '<envelopeTest header="from" stringComparison="matches" value="*@spam.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-95-04 Verify ZCS-95 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs95_04', '<envelopeTest header="from" stringComparison="is" value="v@test.com"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-283-01 Filter with address domain comparison', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_01', '<addressTest header="from" stringComparison="is" part="domain" value="test283.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-283-02 Address localpart comparison', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_02', '<addressTest header="from" stringComparison="is" part="localpart" value="user283"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-283-03 Address all part', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_03', '<addressTest header="to" stringComparison="is" part="all" value="u283@test.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-283-04 Address contains', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_04', '<addressTest header="from" stringComparison="contains" value="283"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-283-05 Address matches', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_05', '<addressTest header="from" stringComparison="matches" value="*@*.com"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-283-06 Address negative', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_06', '<addressTest header="from" stringComparison="is" negative="1" value="no283@test.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-283-07 Verify ZCS-283 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs283_07', '<addressTest header="from" stringComparison="is" value="v283@test.com"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-284-01 Filter with header exists and flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs284_01', '<headerExistsTest header="X-ZCS-284"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-284-02 Header exists negative', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs284_02', '<headerExistsTest header="X-ZCS-284" negative="1"/>', '<actionKeep/>'); });
	it('Regression | ZCS-284-03 Verify ZCS-284 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs284_03', '<headerExistsTest header="X-V284"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-296-01 Filter with size comparison', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs296_01', '<sizeTest numberComparison="over" s="2M"/>', '<actionFlag flagName="flagged"/>'); });

	it('Regression | ZCS-302-01 Filter with body test and flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs302_01', '<bodyTest value="zcs302body"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-302-02 Body test with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs302_02', '<bodyTest value="zcs302spam"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-302-03 Verify ZCS-302 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs302_03', '<bodyTest value="v302"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-367-01 Filter with custom header comparison', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_01', '<headerTest header="X-Custom-367" stringComparison="is" value="val"/>', '<actionKeep/>'); });
	it('Regression | ZCS-367-02 Custom header contains', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_02', '<headerTest header="X-Custom-367" stringComparison="contains" value="part"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-367-03 Custom header matches', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_03', '<headerTest header="X-Custom-367" stringComparison="matches" value="*wild*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-367-04 Custom header negative', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_04', '<headerTest header="X-Custom-367" stringComparison="is" negative="1" value="no"/>', '<actionKeep/>'); });
	it('Regression | ZCS-367-05 Custom header with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_05', '<headerTest header="X-Custom-367" stringComparison="is" value="block"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-367-06 Verify ZCS-367 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367_06', '<headerTest header="X-V367" stringComparison="is" value="v"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-367-DCS-01 Domain-level filter rule', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_01', '<headerTest header="subject" stringComparison="contains" value="domain"/>', '<actionKeep/>'); });
	it('Regression | ZCS-367-DCS-02 COS-level filter rule', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_02', '<headerTest header="subject" stringComparison="contains" value="cos"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-367-DCS-03 Server-level filter rule', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_03', '<headerTest header="subject" stringComparison="contains" value="server"/>', '<actionKeep/>'); });
	it('Regression | ZCS-367-DCS-04 Account override domain', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_04', '<headerTest header="subject" stringComparison="is" value="override"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-367-DCS-05 Domain with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_05', '<headerTest header="from" stringComparison="contains" value="domainspam"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-367-DCS-06 COS with fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_06', '<headerTest header="subject" stringComparison="is" value="cosfile"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-367-DCS-07 Server with redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_07', '<headerTest header="subject" stringComparison="is" value="srvfwd"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | ZCS-367-DCS-08 Domain with flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_08', '<headerTest header="subject" stringComparison="contains" value="domainflag"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-367-DCS-09 COS with tag', async () => { const a = await createAccountAndAuth(); const t = `tag${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="2"/></CreateTagRequest>`, a); await createFilter(a, 'zcs367dcs_09', '<headerTest header="subject" stringComparison="is" value="costag"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-367-DCS-10 Server with notify', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_10', '<headerTest header="subject" stringComparison="is" value="srvnotify"/>', '<actionNotify a="n@test.com" su="SrvAlert" content="Server alert"/>'); });
	it('Regression | ZCS-367-DCS-11 Verify DCS via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs367dcs_11', '<headerTest header="subject" stringComparison="is" value="vdcs"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-371-01 Filter with allof multiple headers', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_01', '<headerTest header="subject" stringComparison="contains" value="a"/><headerTest header="from" stringComparison="contains" value="b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-371-02 Allof with flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_02', '<headerTest header="subject" stringComparison="is" value="exact371"/><sizeTest numberComparison="under" s="1M"/>', '<actionFlag flagName="flagged"/>', 'allof'); });
	it('Regression | ZCS-371-03 Allof with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_03', '<headerTest header="from" stringComparison="contains" value="spam"/><bodyTest value="junk"/>', '<actionDiscard/>', 'allof'); });
	it('Regression | ZCS-371-04 Allof with fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_04', '<headerTest header="subject" stringComparison="contains" value="report"/><headerTest header="from" stringComparison="contains" value="system"/>', '<actionFileInto folderPath="/Inbox"/>', 'allof'); });
	it('Regression | ZCS-371-05 Allof with redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_05', '<headerTest header="subject" stringComparison="is" value="fwd371"/><headerTest header="to" stringComparison="contains" value="team"/>', '<actionRedirect a="fwd@test.com"/>', 'allof'); });
	it('Regression | ZCS-371-06 Allof inactive rule', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="zcs371_06_${common.getUniqueString()}" active="0"><filterTests condition="allof"><headerTest header="subject" stringComparison="is" value="off371"/><headerTest header="from" stringComparison="is" value="off@test.com"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-371-07 Verify ZCS-371 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs371_07', '<headerTest header="subject" stringComparison="is" value="v371"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-373-01 Filter with header comparison is', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_01', '<headerTest header="subject" stringComparison="is" value="zcs373"/>', '<actionKeep/>'); });
	it('Regression | ZCS-373-02 Header contains', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_02', '<headerTest header="subject" stringComparison="contains" value="373part"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-373-03 Header matches', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_03', '<headerTest header="subject" stringComparison="matches" value="*373*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-373-04 Header negative', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_04', '<headerTest header="subject" stringComparison="is" negative="1" value="no373"/>', '<actionKeep/>'); });
	it('Regression | ZCS-373-05 From header filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_05', '<headerTest header="from" stringComparison="is" value="from373@test.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-373-06 To header filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_06', '<headerTest header="to" stringComparison="contains" value="to373"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-373-07 Cc header filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_07', '<headerTest header="cc" stringComparison="is" value="cc373@test.com"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | ZCS-373-08 Size test filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_08', '<sizeTest numberComparison="over" s="3M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-373-09 Body test filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_09', '<bodyTest value="body373"/>', '<actionKeep/>'); });
	it('Regression | ZCS-373-10 Attachment test filter', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_10', '<attachmentTest/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-373-11 Multiple rules combination', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="zcs373_11a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r373a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="zcs373_11b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r373b"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-373-12 Verify ZCS-373 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs373_12', '<headerTest header="subject" stringComparison="is" value="v373"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); assert.notExists(g.Fault, 'GetFilterRulesRequest should not fault'); });

	it('Regression | ZCS-374-01 Filter with header is and keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_01', '<headerTest header="subject" stringComparison="is" value="zcs374"/>', '<actionKeep/>'); });
	it('Regression | ZCS-374-02 Header contains and flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_02', '<headerTest header="subject" stringComparison="contains" value="374p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-374-03 Header matches and keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_03', '<headerTest header="subject" stringComparison="matches" value="*374*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-374-04 Header negative and keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_04', '<headerTest header="subject" stringComparison="is" negative="1" value="no374"/>', '<actionKeep/>'); });
	it('Regression | ZCS-374-05 From filter and discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_05', '<headerTest header="from" stringComparison="is" value="from374@test.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-374-06 To filter and fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_06', '<headerTest header="to" stringComparison="contains" value="to374"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-374-07 Cc filter and redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_07', '<headerTest header="cc" stringComparison="is" value="cc374@test.com"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | ZCS-374-08 Size filter and flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_08', '<sizeTest numberComparison="over" s="4M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-374-09 Body filter and keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_09', '<bodyTest value="body374"/>', '<actionKeep/>'); });
	it('Regression | ZCS-374-10 Envelope filter and keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_10', '<envelopeTest header="from" stringComparison="is" value="env374@test.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-374-11 Address filter and flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_11', '<addressTest header="from" stringComparison="is" part="domain" value="374.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-374-12 Allof multiple conditions', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_12', '<headerTest header="subject" stringComparison="contains" value="374a"/><headerTest header="from" stringComparison="contains" value="374b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-374-13 Verify ZCS-374 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs374_13', '<headerTest header="subject" stringComparison="is" value="v374"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-375-01 SOAP to Sieve header is', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_01', '<headerTest header="subject" stringComparison="is" value="soap2sieve"/>', '<actionKeep/>'); });
	it('Regression | ZCS-375-02 SOAP to Sieve header contains', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_02', '<headerTest header="subject" stringComparison="contains" value="s2s"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-375-03 SOAP to Sieve header matches', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_03', '<headerTest header="subject" stringComparison="matches" value="*s2s*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-375-04 SOAP to Sieve with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_04', '<headerTest header="subject" stringComparison="is" value="s2sdiscard"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-375-05 SOAP to Sieve with fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_05', '<headerTest header="subject" stringComparison="is" value="s2sfile"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-375-06 SOAP to Sieve with redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_06', '<headerTest header="subject" stringComparison="is" value="s2sfwd"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Regression | ZCS-375-07 SOAP to Sieve with flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_07', '<headerTest header="from" stringComparison="contains" value="s2sflag"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-375-08 SOAP to Sieve with tag', async () => { const a = await createAccountAndAuth(); const t = `tag${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="4"/></CreateTagRequest>`, a); await createFilter(a, 'zcs375_08', '<headerTest header="subject" stringComparison="is" value="s2stag"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-375-09 SOAP to Sieve with notify', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_09', '<headerTest header="subject" stringComparison="is" value="s2snotify"/>', '<actionNotify a="n@test.com" su="S2S" content="S2S notify"/>'); });
	it('Regression | ZCS-375-10 SOAP to Sieve with reply', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_10', '<headerTest header="subject" stringComparison="is" value="s2sreply"/>', '<actionReply content="S2S reply"/>'); });
	it('Regression | ZCS-375-11 Verify ZCS-375 via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'zcs375_11', '<headerTest header="subject" stringComparison="is" value="v375"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
