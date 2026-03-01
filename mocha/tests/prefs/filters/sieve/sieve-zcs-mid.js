import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Sieve-ZCS-Mid', function () {
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

	async function ca() { const e = `test.${common.getUniqueString()}@${testDomain}`; await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${e}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken); return await soap.getAccountAuthToken(e); }
	async function cf(a, n, t, act, c = 'anyof') { const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${n}_${common.getUniqueString()}" active="1"><filterTests condition="${c}">${t}</filterTests><filterActions>${act}</filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault, `${n} fail`); return m; }

	it('Regression | ZCS-422-01 Filter with header is subject', async () => { const a = await ca(); await cf(a, 'z422_01', '<headerTest header="subject" stringComparison="is" value="zcs422"/>', '<actionKeep/>'); });
	it('Regression | ZCS-422-02 Header contains from', async () => { const a = await ca(); await cf(a, 'z422_02', '<headerTest header="from" stringComparison="contains" value="422sender"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-422-03 Header matches subject', async () => { const a = await ca(); await cf(a, 'z422_03', '<headerTest header="subject" stringComparison="matches" value="*422*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-422-04 Header negative', async () => { const a = await ca(); await cf(a, 'z422_04', '<headerTest header="subject" stringComparison="is" negative="1" value="no422"/>', '<actionKeep/>'); });
	it('Regression | ZCS-422-05 Discard action', async () => { const a = await ca(); await cf(a, 'z422_05', '<headerTest header="from" stringComparison="is" value="spam422@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-422-06 Fileinto action', async () => { const a = await ca(); await cf(a, 'z422_06', '<headerTest header="subject" stringComparison="is" value="file422"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-422-07 Redirect action', async () => { const a = await ca(); await cf(a, 'z422_07', '<headerTest header="subject" stringComparison="is" value="fwd422"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-422-08 Tag action', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="1"/></CreateTagRequest>`, a); await cf(a, 'z422_08', '<headerTest header="subject" stringComparison="is" value="tag422"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-422-09 Notify action', async () => { const a = await ca(); await cf(a, 'z422_09', '<headerTest header="subject" stringComparison="is" value="notify422"/>', '<actionNotify a="n@t.com" su="422" content="422"/>'); });
	it('Regression | ZCS-422-10 Multiple actions', async () => { const a = await ca(); await cf(a, 'z422_10', '<headerTest header="subject" stringComparison="contains" value="multi422"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-422-11 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z422_11', '<headerTest header="subject" stringComparison="is" value="v422"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-500-01 Filter with header comparison', async () => { const a = await ca(); await cf(a, 'z500_01', '<headerTest header="subject" stringComparison="is" value="zcs500"/>', '<actionKeep/>'); });
	it('Regression | ZCS-500-02 Header contains', async () => { const a = await ca(); await cf(a, 'z500_02', '<headerTest header="subject" stringComparison="contains" value="500p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-500-03 Header matches', async () => { const a = await ca(); await cf(a, 'z500_03', '<headerTest header="subject" stringComparison="matches" value="*500*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-500-04 From comparisons', async () => { const a = await ca(); await cf(a, 'z500_04', '<headerTest header="from" stringComparison="is" value="from500@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-500-05 Size test', async () => { const a = await ca(); await cf(a, 'z500_05', '<sizeTest numberComparison="over" s="2M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-500-06 Body test', async () => { const a = await ca(); await cf(a, 'z500_06', '<bodyTest value="body500"/>', '<actionKeep/>'); });
	it('Regression | ZCS-500-07 Allof conditions', async () => { const a = await ca(); await cf(a, 'z500_07', '<headerTest header="subject" stringComparison="contains" value="500a"/><sizeTest numberComparison="under" s="1M"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-500-08 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z500_08', '<headerTest header="subject" stringComparison="is" value="v500"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-540-01 SOAP to Sieve conversion filter', async () => { const a = await ca(); await cf(a, 'z540_01', '<headerTest header="subject" stringComparison="is" value="soap540"/>', '<actionKeep/>'); });
	it('Regression | ZCS-540-02 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z540_02', '<headerTest header="subject" stringComparison="is" value="v540"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-559-01 Escape sequence in filter value', async () => { const a = await ca(); await cf(a, 'z559_01', '<headerTest header="subject" stringComparison="contains" value="escape559"/>', '<actionKeep/>'); });
	it('Regression | ZCS-559-02 Escape in matches comparison', async () => { const a = await ca(); await cf(a, 'z559_02', '<headerTest header="subject" stringComparison="matches" value="*esc*"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-559-03 Escape with discard', async () => { const a = await ca(); await cf(a, 'z559_03', '<headerTest header="subject" stringComparison="is" value="escdiscard"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-559-04 Verify escape via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z559_04', '<headerTest header="subject" stringComparison="is" value="v559"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-560-01 Notification escape sequences', async () => { const a = await ca(); await cf(a, 'z560_01', '<headerTest header="subject" stringComparison="is" value="notify560"/>', '<actionNotify a="n@t.com" su="560" content="Notify 560"/>'); });
	it('Regression | ZCS-560-02 Notification with origHeaders', async () => { const a = await ca(); await cf(a, 'z560_02', '<headerTest header="subject" stringComparison="contains" value="orig560"/>', '<actionNotify a="n@t.com" su="Orig" content="orig"/>'); });
	it('Regression | ZCS-560-03 Notification with maxBodySize', async () => { const a = await ca(); await cf(a, 'z560_03', '<headerTest header="from" stringComparison="contains" value="vip560"/>', '<actionNotify a="n@t.com" su="VIP" content="vip" maxBodySize="1024"/>'); });
	it('Regression | ZCS-560-04 Notification with keep', async () => { const a = await ca(); await cf(a, 'z560_04', '<headerTest header="subject" stringComparison="is" value="nk560"/>', '<actionNotify a="n@t.com" su="NK" content="nk"/><actionKeep/>'); });
	it('Regression | ZCS-560-05 Verify notification via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z560_05', '<headerTest header="subject" stringComparison="is" value="v560"/>', '<actionNotify a="n@t.com" su="V" content="v"/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-561-01 Filter with header is', async () => { const a = await ca(); await cf(a, 'z561_01', '<headerTest header="subject" stringComparison="is" value="zcs561"/>', '<actionKeep/>'); });
	it('Regression | ZCS-561-02 Header contains', async () => { const a = await ca(); await cf(a, 'z561_02', '<headerTest header="subject" stringComparison="contains" value="561p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-561-03 Header matches', async () => { const a = await ca(); await cf(a, 'z561_03', '<headerTest header="subject" stringComparison="matches" value="*561*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-561-04 From filter', async () => { const a = await ca(); await cf(a, 'z561_04', '<headerTest header="from" stringComparison="is" value="from561@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-561-05 To filter', async () => { const a = await ca(); await cf(a, 'z561_05', '<headerTest header="to" stringComparison="contains" value="to561"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-561-06 Redirect', async () => { const a = await ca(); await cf(a, 'z561_06', '<headerTest header="subject" stringComparison="is" value="fwd561"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-561-07 Allof condition', async () => { const a = await ca(); await cf(a, 'z561_07', '<headerTest header="subject" stringComparison="contains" value="a"/><headerTest header="from" stringComparison="contains" value="b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-561-08 Negative test', async () => { const a = await ca(); await cf(a, 'z561_08', '<headerTest header="subject" stringComparison="is" negative="1" value="no561"/>', '<actionKeep/>'); });
	it('Regression | ZCS-561-09 Multiple rules', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z561_09a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r561a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="z561_09b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r561b"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-561-10 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z561_10', '<headerTest header="subject" stringComparison="is" value="v561"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-806-01 LDAP attributes filter', async () => { const a = await ca(); await cf(a, 'z806_01', '<headerTest header="subject" stringComparison="is" value="ldap806"/>', '<actionKeep/>'); });
	it('Regression | ZCS-806-02 Verify LDAP via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z806_02', '<headerTest header="subject" stringComparison="is" value="v806"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-840-01 Filter edge case', async () => { const a = await ca(); await cf(a, 'z840_01', '<headerTest header="subject" stringComparison="is" value="zcs840"/>', '<actionKeep/>'); });

	it('Regression | ZCS-841-01 Filter with envelope comparison', async () => { const a = await ca(); await cf(a, 'z841_01', '<envelopeTest header="from" stringComparison="is" value="env841@t.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-841-02 Envelope contains', async () => { const a = await ca(); await cf(a, 'z841_02', '<envelopeTest header="to" stringComparison="contains" value="dest841"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-841-03 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z841_03', '<envelopeTest header="from" stringComparison="is" value="v841@t.com"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-842-01 Multiple filter rules', async () => { const a = await ca(); await cf(a, 'z842_01', '<headerTest header="subject" stringComparison="is" value="zcs842"/>', '<actionKeep/>'); });
	it('Regression | ZCS-842-02 Header contains', async () => { const a = await ca(); await cf(a, 'z842_02', '<headerTest header="subject" stringComparison="contains" value="842p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-842-03 Header matches', async () => { const a = await ca(); await cf(a, 'z842_03', '<headerTest header="subject" stringComparison="matches" value="*842*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-842-04 From header', async () => { const a = await ca(); await cf(a, 'z842_04', '<headerTest header="from" stringComparison="is" value="from842@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-842-05 Size test', async () => { const a = await ca(); await cf(a, 'z842_05', '<sizeTest numberComparison="over" s="3M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-842-06 Body test', async () => { const a = await ca(); await cf(a, 'z842_06', '<bodyTest value="body842"/>', '<actionKeep/>'); });
	it('Regression | ZCS-842-07 Allof condition', async () => { const a = await ca(); await cf(a, 'z842_07', '<headerTest header="subject" stringComparison="contains" value="842a"/><headerTest header="from" stringComparison="contains" value="842b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-842-08 Negative test', async () => { const a = await ca(); await cf(a, 'z842_08', '<headerTest header="subject" stringComparison="is" negative="1" value="no842"/>', '<actionKeep/>'); });
	it('Regression | ZCS-842-09 Multiple actions', async () => { const a = await ca(); await cf(a, 'z842_09', '<headerTest header="subject" stringComparison="contains" value="multi842"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-842-10 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z842_10', '<headerTest header="subject" stringComparison="is" value="v842"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
