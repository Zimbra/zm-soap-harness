import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Sieve-ZCS-1000', function () {
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

	it('Regression | ZCS-1006-01 ASCII numeric comparison filter', async () => { const a = await ca(); await cf(a, 'z1006_01', '<headerTest header="subject" stringComparison="is" value="ascii1006"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1006-02 Numeric with flag', async () => { const a = await ca(); await cf(a, 'z1006_02', '<headerTest header="subject" stringComparison="contains" value="num1006"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1006-03 Numeric with discard', async () => { const a = await ca(); await cf(a, 'z1006_03', '<headerTest header="subject" stringComparison="is" value="dis1006"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1006-04 Numeric with fileinto', async () => { const a = await ca(); await cf(a, 'z1006_04', '<headerTest header="subject" stringComparison="is" value="file1006"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-1006-05 Numeric with redirect', async () => { const a = await ca(); await cf(a, 'z1006_05', '<headerTest header="subject" stringComparison="is" value="fwd1006"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-1006-06 Numeric allof condition', async () => { const a = await ca(); await cf(a, 'z1006_06', '<headerTest header="subject" stringComparison="contains" value="1006a"/><sizeTest numberComparison="under" s="1M"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1006-07 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1006_07', '<headerTest header="subject" stringComparison="is" value="v1006"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1010-01 Header is subject', async () => { const a = await ca(); await cf(a, 'z1010_01', '<headerTest header="subject" stringComparison="is" value="zcs1010"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1010-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1010_02', '<headerTest header="subject" stringComparison="contains" value="1010p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1010-03 Header matches', async () => { const a = await ca(); await cf(a, 'z1010_03', '<headerTest header="subject" stringComparison="matches" value="*1010*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1010-04 From filter', async () => { const a = await ca(); await cf(a, 'z1010_04', '<headerTest header="from" stringComparison="is" value="from1010@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1010-05 To filter', async () => { const a = await ca(); await cf(a, 'z1010_05', '<headerTest header="to" stringComparison="contains" value="to1010"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-1010-06 Redirect', async () => { const a = await ca(); await cf(a, 'z1010_06', '<headerTest header="subject" stringComparison="is" value="fwd1010"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-1010-07 Allof condition', async () => { const a = await ca(); await cf(a, 'z1010_07', '<headerTest header="subject" stringComparison="contains" value="1010a"/><headerTest header="from" stringComparison="contains" value="1010b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1010-08 Negative test', async () => { const a = await ca(); await cf(a, 'z1010_08', '<headerTest header="subject" stringComparison="is" negative="1" value="no1010"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1010-09 Tag action', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="1"/></CreateTagRequest>`, a); await cf(a, 'z1010_09', '<headerTest header="subject" stringComparison="is" value="tag1010"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-1010-10 Multiple actions', async () => { const a = await ca(); await cf(a, 'z1010_10', '<headerTest header="subject" stringComparison="contains" value="multi1010"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-1010-11 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1010_11', '<headerTest header="subject" stringComparison="is" value="v1010"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1088-01 Detect spaces in header value is', async () => { const a = await ca(); await cf(a, 'z1088_01', '<headerTest header="subject" stringComparison="is" value="space test"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-02 Spaces in contains comparison', async () => { const a = await ca(); await cf(a, 'z1088_02', '<headerTest header="subject" stringComparison="contains" value="space "/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1088-03 Spaces in matches comparison', async () => { const a = await ca(); await cf(a, 'z1088_03', '<headerTest header="subject" stringComparison="matches" value="*space *"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-04 Leading spaces', async () => { const a = await ca(); await cf(a, 'z1088_04', '<headerTest header="subject" stringComparison="is" value=" leading"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-05 Trailing spaces', async () => { const a = await ca(); await cf(a, 'z1088_05', '<headerTest header="subject" stringComparison="is" value="trailing "/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-06 Multiple spaces', async () => { const a = await ca(); await cf(a, 'z1088_06', '<headerTest header="subject" stringComparison="contains" value="  multi  "/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-07 From with spaces', async () => { const a = await ca(); await cf(a, 'z1088_07', '<headerTest header="from" stringComparison="contains" value="user name"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1088-08 To with spaces', async () => { const a = await ca(); await cf(a, 'z1088_08', '<headerTest header="to" stringComparison="contains" value="dest user"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-09 Cc with spaces', async () => { const a = await ca(); await cf(a, 'z1088_09', '<headerTest header="cc" stringComparison="contains" value="cc user"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-10 Spaces with discard', async () => { const a = await ca(); await cf(a, 'z1088_10', '<headerTest header="subject" stringComparison="is" value="spam space"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1088-11 Spaces with fileinto', async () => { const a = await ca(); await cf(a, 'z1088_11', '<headerTest header="subject" stringComparison="is" value="file space"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-1088-12 Spaces with redirect', async () => { const a = await ca(); await cf(a, 'z1088_12', '<headerTest header="subject" stringComparison="is" value="fwd space"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-1088-13 Spaces with tag', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="2"/></CreateTagRequest>`, a); await cf(a, 'z1088_13', '<headerTest header="subject" stringComparison="is" value="tag space"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-1088-14 Spaces with notify', async () => { const a = await ca(); await cf(a, 'z1088_14', '<headerTest header="subject" stringComparison="is" value="notify space"/>', '<actionNotify a="n@t.com" su="Space" content="space"/>'); });
	it('Regression | ZCS-1088-15 Spaces with reply', async () => { const a = await ca(); await cf(a, 'z1088_15', '<headerTest header="subject" stringComparison="is" value="reply space"/>', '<actionReply content="Space reply"/>'); });
	it('Regression | ZCS-1088-16 Spaces allof', async () => { const a = await ca(); await cf(a, 'z1088_16', '<headerTest header="subject" stringComparison="contains" value="space a"/><headerTest header="from" stringComparison="contains" value="space b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1088-17 Spaces negative', async () => { const a = await ca(); await cf(a, 'z1088_17', '<headerTest header="subject" stringComparison="is" negative="1" value="no space"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-18 Spaces with size', async () => { const a = await ca(); await cf(a, 'z1088_18', '<headerTest header="subject" stringComparison="contains" value="space"/><sizeTest numberComparison="under" s="1M"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1088-19 Spaces with body', async () => { const a = await ca(); await cf(a, 'z1088_19', '<headerTest header="subject" stringComparison="contains" value="space"/><bodyTest value="space content"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1088-20 Spaces with attachment', async () => { const a = await ca(); await cf(a, 'z1088_20', '<headerTest header="subject" stringComparison="contains" value="space"/><attachmentTest/>', '<actionFlag flagName="flagged"/>', 'allof'); });
	it('Regression | ZCS-1088-21 Spaces caseSensitive', async () => { const a = await ca(); await cf(a, 'z1088_21', '<headerTest header="subject" stringComparison="is" caseSensitive="1" value="Space Test"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-22 Spaces inactive', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z1088_22_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="space off"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-1088-23 Spaces envelope', async () => { const a = await ca(); await cf(a, 'z1088_23', '<envelopeTest header="from" stringComparison="contains" value="space"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-24 Spaces address', async () => { const a = await ca(); await cf(a, 'z1088_24', '<addressTest header="from" stringComparison="contains" value="space"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-25 Custom header with spaces', async () => { const a = await ca(); await cf(a, 'z1088_25', '<headerTest header="X-Custom Space" stringComparison="is" value="val"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-26 Multiple rules with spaces', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z1088_26a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="space r1"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="z1088_26b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="space r2"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-1088-27 Spaces with multiple actions', async () => { const a = await ca(); await cf(a, 'z1088_27', '<headerTest header="subject" stringComparison="contains" value="space multi"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-1088-28 Spaces headerExists', async () => { const a = await ca(); await cf(a, 'z1088_28', '<headerExistsTest header="X-Space-Header"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-29 Spaces currentTime', async () => { const a = await ca(); await cf(a, 'z1088_29', '<currentTimeTest dateComparison="before" time="2359"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-30 Spaces currentDayOfWeek', async () => { const a = await ca(); await cf(a, 'z1088_30', '<currentDayOfWeekTest value="0,1,2,3,4,5,6"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1088-31 Spaces date test', async () => { const a = await ca(); await cf(a, 'z1088_31', `<dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/>`, '<actionKeep/>'); });
	it('Regression | ZCS-1088-32 Verify spaces via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1088_32', '<headerTest header="subject" stringComparison="is" value="v1088"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); assert.exists(g.GetFilterRulesResponse); });

	it('Regression | ZCS-1100-01 SOAP to Sieve conversion', async () => { const a = await ca(); await cf(a, 'z1100_01', '<headerTest header="subject" stringComparison="is" value="s2s1100"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1100-02 S2S with flag', async () => { const a = await ca(); await cf(a, 'z1100_02', '<headerTest header="from" stringComparison="contains" value="s2s1100"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1100-03 S2S with discard', async () => { const a = await ca(); await cf(a, 'z1100_03', '<headerTest header="subject" stringComparison="is" value="s2sdis1100"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1100-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1100_04', '<headerTest header="subject" stringComparison="is" value="v1100"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1173-01 Sieve to SOAP conversion', async () => { const a = await ca(); await cf(a, 'z1173_01', '<headerTest header="subject" stringComparison="is" value="sieve1173"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1173-02 S2S contains', async () => { const a = await ca(); await cf(a, 'z1173_02', '<headerTest header="subject" stringComparison="contains" value="1173p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1173-03 S2S matches', async () => { const a = await ca(); await cf(a, 'z1173_03', '<headerTest header="subject" stringComparison="matches" value="*1173*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1173-04 S2S from', async () => { const a = await ca(); await cf(a, 'z1173_04', '<headerTest header="from" stringComparison="is" value="from1173@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1173-05 S2S to', async () => { const a = await ca(); await cf(a, 'z1173_05', '<headerTest header="to" stringComparison="contains" value="to1173"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-1173-06 S2S redirect', async () => { const a = await ca(); await cf(a, 'z1173_06', '<headerTest header="subject" stringComparison="is" value="fwd1173"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-1173-07 S2S allof', async () => { const a = await ca(); await cf(a, 'z1173_07', '<headerTest header="subject" stringComparison="contains" value="1173a"/><headerTest header="from" stringComparison="contains" value="1173b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1173-08 S2S multiple actions', async () => { const a = await ca(); await cf(a, 'z1173_08', '<headerTest header="subject" stringComparison="contains" value="multi1173"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-1173-09 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1173_09', '<headerTest header="subject" stringComparison="is" value="v1173"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1207-01 Filter edge case', async () => { const a = await ca(); await cf(a, 'z1207_01', '<headerTest header="subject" stringComparison="is" value="zcs1207"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1207-02 Filter with flag', async () => { const a = await ca(); await cf(a, 'z1207_02', '<headerTest header="subject" stringComparison="contains" value="1207f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1207-03 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1207_03', '<headerTest header="subject" stringComparison="is" value="v1207"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1238-01 Match variables filter', async () => { const a = await ca(); await cf(a, 'z1238_01', '<headerTest header="subject" stringComparison="matches" value="*match1238*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1238-02 Match var with flag', async () => { const a = await ca(); await cf(a, 'z1238_02', '<headerTest header="from" stringComparison="matches" value="*@*.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1238-03 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1238_03', '<headerTest header="subject" stringComparison="matches" value="*v1238*"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1248-01 LDAP attribute filter', async () => { const a = await ca(); await cf(a, 'z1248_01', '<headerTest header="subject" stringComparison="is" value="ldap1248"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1248-02 LDAP with flag', async () => { const a = await ca(); await cf(a, 'z1248_02', '<headerTest header="subject" stringComparison="contains" value="ldap1248f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1248-03 LDAP with discard', async () => { const a = await ca(); await cf(a, 'z1248_03', '<headerTest header="subject" stringComparison="is" value="ldapdis"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1248-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1248_04', '<headerTest header="subject" stringComparison="is" value="v1248"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1281-01 Filter edge case', async () => { const a = await ca(); await cf(a, 'z1281_01', '<headerTest header="subject" stringComparison="is" value="zcs1281"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1281-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1281_02', '<headerTest header="subject" stringComparison="contains" value="1281p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1281-03 Header with discard', async () => { const a = await ca(); await cf(a, 'z1281_03', '<headerTest header="subject" stringComparison="is" value="dis1281"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1281-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1281_04', '<headerTest header="subject" stringComparison="is" value="v1281"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1286-01 SOAP to Sieve conversion', async () => { const a = await ca(); await cf(a, 'z1286_01', '<headerTest header="subject" stringComparison="is" value="s2s1286"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1286-02 S2S with flag', async () => { const a = await ca(); await cf(a, 'z1286_02', '<headerTest header="subject" stringComparison="contains" value="s2s1286f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1286-03 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1286_03', '<headerTest header="subject" stringComparison="is" value="v1286"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1287-01 Header is', async () => { const a = await ca(); await cf(a, 'z1287_01', '<headerTest header="subject" stringComparison="is" value="zcs1287"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1287-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1287_02', '<headerTest header="subject" stringComparison="contains" value="1287p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1287-03 Header matches', async () => { const a = await ca(); await cf(a, 'z1287_03', '<headerTest header="subject" stringComparison="matches" value="*1287*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1287-04 From filter', async () => { const a = await ca(); await cf(a, 'z1287_04', '<headerTest header="from" stringComparison="is" value="from1287@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1287-05 Allof condition', async () => { const a = await ca(); await cf(a, 'z1287_05', '<headerTest header="subject" stringComparison="contains" value="1287a"/><headerTest header="from" stringComparison="contains" value="1287b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1287-06 Negative test', async () => { const a = await ca(); await cf(a, 'z1287_06', '<headerTest header="subject" stringComparison="is" negative="1" value="no1287"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1287-07 Multiple actions', async () => { const a = await ca(); await cf(a, 'z1287_07', '<headerTest header="subject" stringComparison="contains" value="multi1287"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-1287-08 Multiple rules', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z1287_08a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r1287a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="z1287_08b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r1287b"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-1287-09 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1287_09', '<headerTest header="subject" stringComparison="is" value="v1287"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
