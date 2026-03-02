import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Sieve > Sieve ZCS High', function () {
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

	it('Regression | ZCS-860-01 EditHeader addheader filter', async () => { const a = await ca(); await cf(a, 'z860_01', '<headerTest header="subject" stringComparison="is" value="add860"/>', '<actionKeep/>'); });
	it('Regression | ZCS-860-02 EditHeader deleteheader filter', async () => { const a = await ca(); await cf(a, 'z860_02', '<headerTest header="subject" stringComparison="is" value="del860"/>', '<actionKeep/>'); });
	it('Regression | ZCS-860-03 EditHeader replaceheader filter', async () => { const a = await ca(); await cf(a, 'z860_03', '<headerTest header="subject" stringComparison="is" value="rep860"/>', '<actionKeep/>'); });
	it('Regression | ZCS-860-04 EditHeader with flag', async () => { const a = await ca(); await cf(a, 'z860_04', '<headerTest header="subject" stringComparison="contains" value="edit860f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-860-05 EditHeader with discard', async () => { const a = await ca(); await cf(a, 'z860_05', '<headerTest header="subject" stringComparison="is" value="editdiscard860"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-860-06 EditHeader with fileinto', async () => { const a = await ca(); await cf(a, 'z860_06', '<headerTest header="subject" stringComparison="is" value="editfile860"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-860-07 EditHeader with redirect', async () => { const a = await ca(); await cf(a, 'z860_07', '<headerTest header="subject" stringComparison="is" value="editfwd860"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-860-08 EditHeader allof', async () => { const a = await ca(); await cf(a, 'z860_08', '<headerTest header="subject" stringComparison="contains" value="860a"/><headerTest header="from" stringComparison="contains" value="860b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-860-09 EditHeader negative', async () => { const a = await ca(); await cf(a, 'z860_09', '<headerTest header="subject" stringComparison="is" negative="1" value="no860"/>', '<actionKeep/>'); });
	it('Regression | ZCS-860-10 EditHeader inactive', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z860_10_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="inactive860"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-860-11 Multiple editheader rules', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z860_11a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r860a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="z860_11b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r860b"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-860-12 Verify EditHeader via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z860_12', '<headerTest header="subject" stringComparison="is" value="v860"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); assert.exists(g.GetFilterRulesResponse); });

	it('Regression | ZCS-863-01 Filter edge case', async () => { const a = await ca(); await cf(a, 'z863_01', '<headerTest header="subject" stringComparison="is" value="zcs863"/>', '<actionKeep/>'); });

	it('Regression | ZCS-865-01 Header is subject', async () => { const a = await ca(); await cf(a, 'z865_01', '<headerTest header="subject" stringComparison="is" value="zcs865"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-02 Header contains', async () => { const a = await ca(); await cf(a, 'z865_02', '<headerTest header="subject" stringComparison="contains" value="865p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-865-03 Header matches', async () => { const a = await ca(); await cf(a, 'z865_03', '<headerTest header="subject" stringComparison="matches" value="*865*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-04 Header negative', async () => { const a = await ca(); await cf(a, 'z865_04', '<headerTest header="subject" stringComparison="is" negative="1" value="no865"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-05 From header', async () => { const a = await ca(); await cf(a, 'z865_05', '<headerTest header="from" stringComparison="is" value="from865@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-865-06 To header', async () => { const a = await ca(); await cf(a, 'z865_06', '<headerTest header="to" stringComparison="contains" value="to865"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-865-07 Cc header', async () => { const a = await ca(); await cf(a, 'z865_07', '<headerTest header="cc" stringComparison="is" value="cc865@t.com"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-865-08 Size test over', async () => { const a = await ca(); await cf(a, 'z865_08', '<sizeTest numberComparison="over" s="2M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-865-09 Size test under', async () => { const a = await ca(); await cf(a, 'z865_09', '<sizeTest numberComparison="under" s="500K"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-10 Body test', async () => { const a = await ca(); await cf(a, 'z865_10', '<bodyTest value="body865"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-11 Attachment test', async () => { const a = await ca(); await cf(a, 'z865_11', '<attachmentTest/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-865-12 HeaderExists test', async () => { const a = await ca(); await cf(a, 'z865_12', '<headerExistsTest header="X-865"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-13 Envelope test', async () => { const a = await ca(); await cf(a, 'z865_13', '<envelopeTest header="from" stringComparison="is" value="env865@t.com"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-14 Address domain', async () => { const a = await ca(); await cf(a, 'z865_14', '<addressTest header="from" stringComparison="is" part="domain" value="865.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-865-15 Address localpart', async () => { const a = await ca(); await cf(a, 'z865_15', '<addressTest header="from" stringComparison="is" part="localpart" value="user865"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-16 CurrentTime test', async () => { const a = await ca(); await cf(a, 'z865_16', '<currentTimeTest dateComparison="before" time="2359"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-17 CurrentDayOfWeek test', async () => { const a = await ca(); await cf(a, 'z865_17', '<currentDayOfWeekTest value="0,1,2,3,4,5,6"/>', '<actionKeep/>'); });
	it('Regression | ZCS-865-18 Allof conditions', async () => { const a = await ca(); await cf(a, 'z865_18', '<headerTest header="subject" stringComparison="contains" value="865a"/><headerTest header="from" stringComparison="contains" value="865b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-865-19 Tag action', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="1"/></CreateTagRequest>`, a); await cf(a, 'z865_19', '<headerTest header="subject" stringComparison="is" value="tag865"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-865-20 Notify action', async () => { const a = await ca(); await cf(a, 'z865_20', '<headerTest header="subject" stringComparison="is" value="n865"/>', '<actionNotify a="n@t.com" su="865" content="865"/>'); });
	it('Regression | ZCS-865-21 Reply action', async () => { const a = await ca(); await cf(a, 'z865_21', '<headerTest header="subject" stringComparison="is" value="reply865"/>', '<actionReply content="Reply 865"/>'); });
	it('Regression | ZCS-865-22 Multiple actions', async () => { const a = await ca(); await cf(a, 'z865_22', '<headerTest header="subject" stringComparison="contains" value="multi865"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-865-23 Inactive rule', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z865_23_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="off865"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-865-24 Multiple rules', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z865_24a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r865a"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="z865_24b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="r865b"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-865-25 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z865_25', '<headerTest header="subject" stringComparison="is" value="v865"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-869-01 Header is', async () => { const a = await ca(); await cf(a, 'z869_01', '<headerTest header="subject" stringComparison="is" value="zcs869"/>', '<actionKeep/>'); });
	it('Regression | ZCS-869-02 Header contains', async () => { const a = await ca(); await cf(a, 'z869_02', '<headerTest header="subject" stringComparison="contains" value="869p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-869-03 Header matches', async () => { const a = await ca(); await cf(a, 'z869_03', '<headerTest header="subject" stringComparison="matches" value="*869*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-869-04 From filter', async () => { const a = await ca(); await cf(a, 'z869_04', '<headerTest header="from" stringComparison="is" value="from869@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-869-05 To filter', async () => { const a = await ca(); await cf(a, 'z869_05', '<headerTest header="to" stringComparison="contains" value="to869"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-869-06 Redirect', async () => { const a = await ca(); await cf(a, 'z869_06', '<headerTest header="subject" stringComparison="is" value="fwd869"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-869-07 Size test', async () => { const a = await ca(); await cf(a, 'z869_07', '<sizeTest numberComparison="over" s="1M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-869-08 Body test', async () => { const a = await ca(); await cf(a, 'z869_08', '<bodyTest value="body869"/>', '<actionKeep/>'); });
	it('Regression | ZCS-869-09 Allof condition', async () => { const a = await ca(); await cf(a, 'z869_09', '<headerTest header="subject" stringComparison="contains" value="869a"/><headerTest header="from" stringComparison="contains" value="869b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-869-10 Tag action', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="1"/></CreateTagRequest>`, a); await cf(a, 'z869_10', '<headerTest header="subject" stringComparison="is" value="tag869"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-869-11 Notify action', async () => { const a = await ca(); await cf(a, 'z869_11', '<headerTest header="subject" stringComparison="is" value="n869"/>', '<actionNotify a="n@t.com" su="869" content="869"/>'); });
	it('Regression | ZCS-869-12 Multiple actions', async () => { const a = await ca(); await cf(a, 'z869_12', '<headerTest header="subject" stringComparison="contains" value="multi869"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-869-13 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z869_13', '<headerTest header="subject" stringComparison="is" value="v869"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-870-01 Notification return path escape', async () => { const a = await ca(); await cf(a, 'z870_01', '<headerTest header="subject" stringComparison="is" value="n870"/>', '<actionNotify a="n@t.com" su="870" content="870"/>'); });
	it('Regression | ZCS-870-02 Notify with origHeaders', async () => { const a = await ca(); await cf(a, 'z870_02', '<headerTest header="subject" stringComparison="contains" value="orig870"/>', '<actionNotify a="n@t.com" su="Orig870" content="orig"/>'); });
	it('Regression | ZCS-870-03 Notify with maxBodySize', async () => { const a = await ca(); await cf(a, 'z870_03', '<headerTest header="from" stringComparison="contains" value="vip870"/>', '<actionNotify a="n@t.com" su="VIP870" content="vip" maxBodySize="2048"/>'); });
	it('Regression | ZCS-870-04 Notify with keep', async () => { const a = await ca(); await cf(a, 'z870_04', '<headerTest header="subject" stringComparison="is" value="nk870"/>', '<actionNotify a="n@t.com" su="NK870" content="nk"/><actionKeep/>'); });
	it('Regression | ZCS-870-05 Notify with flag', async () => { const a = await ca(); await cf(a, 'z870_05', '<headerTest header="subject" stringComparison="is" value="nf870"/>', '<actionNotify a="n@t.com" su="NF870" content="nf"/><actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-870-06 Notify with discard', async () => { const a = await ca(); await cf(a, 'z870_06', '<headerTest header="subject" stringComparison="is" value="nd870"/>', '<actionNotify a="n@t.com" su="ND870" content="nd"/><actionDiscard/>'); });
	it('Regression | ZCS-870-07 Notify allof condition', async () => { const a = await ca(); await cf(a, 'z870_07', '<headerTest header="subject" stringComparison="contains" value="870a"/><headerTest header="from" stringComparison="contains" value="870b"/>', '<actionNotify a="n@t.com" su="Allof870" content="allof"/>', 'allof'); });
	it('Regression | ZCS-870-08 Notify inactive rule', async () => { const a = await ca(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="z870_08_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="off870"/></filterTests><filterActions><actionNotify a="n@t.com" su="Off870" content="off"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Regression | ZCS-870-09 Verify notify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z870_09', '<headerTest header="subject" stringComparison="is" value="v870"/>', '<actionNotify a="n@t.com" su="V870" content="v"/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-871-01 Match variables filter', async () => { const a = await ca(); await cf(a, 'z871_01', '<headerTest header="subject" stringComparison="matches" value="*match871*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-871-02 Match var with flag', async () => { const a = await ca(); await cf(a, 'z871_02', '<headerTest header="from" stringComparison="matches" value="*@*.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-871-03 Match var with discard', async () => { const a = await ca(); await cf(a, 'z871_03', '<headerTest header="subject" stringComparison="matches" value="*spam*"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-871-04 Verify match via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z871_04', '<headerTest header="subject" stringComparison="matches" value="*v871*"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-873-01 Header is', async () => { const a = await ca(); await cf(a, 'z873_01', '<headerTest header="subject" stringComparison="is" value="zcs873"/>', '<actionKeep/>'); });
	it('Regression | ZCS-873-02 Header contains', async () => { const a = await ca(); await cf(a, 'z873_02', '<headerTest header="subject" stringComparison="contains" value="873p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-873-03 Header matches', async () => { const a = await ca(); await cf(a, 'z873_03', '<headerTest header="subject" stringComparison="matches" value="*873*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-873-04 From filter', async () => { const a = await ca(); await cf(a, 'z873_04', '<headerTest header="from" stringComparison="is" value="from873@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-873-05 Allof condition', async () => { const a = await ca(); await cf(a, 'z873_05', '<headerTest header="subject" stringComparison="contains" value="873a"/><headerTest header="from" stringComparison="contains" value="873b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-873-06 Negative test', async () => { const a = await ca(); await cf(a, 'z873_06', '<headerTest header="subject" stringComparison="is" negative="1" value="no873"/>', '<actionKeep/>'); });
	it('Regression | ZCS-873-07 Tag action', async () => { const a = await ca(); const t = `t${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="3"/></CreateTagRequest>`, a); await cf(a, 'z873_07', '<headerTest header="subject" stringComparison="is" value="tag873"/>', `<actionTag tagName="${t}"/>`); });
	it('Regression | ZCS-873-08 Multiple actions', async () => { const a = await ca(); await cf(a, 'z873_08', '<headerTest header="subject" stringComparison="contains" value="multi873"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-873-09 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z873_09', '<headerTest header="subject" stringComparison="is" value="v873"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-880-01 Filter with header test', async () => { const a = await ca(); await cf(a, 'z880_01', '<headerTest header="subject" stringComparison="is" value="zcs880"/>', '<actionKeep/>'); });
	it('Regression | ZCS-880-02 Header with flag', async () => { const a = await ca(); await cf(a, 'z880_02', '<headerTest header="subject" stringComparison="contains" value="880f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-880-03 Header with discard', async () => { const a = await ca(); await cf(a, 'z880_03', '<headerTest header="subject" stringComparison="is" value="discard880"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-880-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z880_04', '<headerTest header="subject" stringComparison="is" value="v880"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-887-01 Immutable filter', async () => { const a = await ca(); await cf(a, 'z887_01', '<headerTest header="subject" stringComparison="is" value="immutable887"/>', '<actionKeep/>'); });
	it('Regression | ZCS-887-02 Verify immutable via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z887_02', '<headerTest header="subject" stringComparison="is" value="v887"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-891-01 Header is subject', async () => { const a = await ca(); await cf(a, 'z891_01', '<headerTest header="subject" stringComparison="is" value="zcs891"/>', '<actionKeep/>'); });
	it('Regression | ZCS-891-02 Header contains', async () => { const a = await ca(); await cf(a, 'z891_02', '<headerTest header="subject" stringComparison="contains" value="891p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-891-03 Header matches', async () => { const a = await ca(); await cf(a, 'z891_03', '<headerTest header="subject" stringComparison="matches" value="*891*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-891-04 From filter', async () => { const a = await ca(); await cf(a, 'z891_04', '<headerTest header="from" stringComparison="is" value="from891@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-891-05 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z891_05', '<headerTest header="subject" stringComparison="is" value="v891"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-892-01 Header is', async () => { const a = await ca(); await cf(a, 'z892_01', '<headerTest header="subject" stringComparison="is" value="zcs892"/>', '<actionKeep/>'); });
	it('Regression | ZCS-892-02 Header contains', async () => { const a = await ca(); await cf(a, 'z892_02', '<headerTest header="subject" stringComparison="contains" value="892p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-892-03 Header matches', async () => { const a = await ca(); await cf(a, 'z892_03', '<headerTest header="subject" stringComparison="matches" value="*892*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-892-04 From filter', async () => { const a = await ca(); await cf(a, 'z892_04', '<headerTest header="from" stringComparison="is" value="from892@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-892-05 To filter', async () => { const a = await ca(); await cf(a, 'z892_05', '<headerTest header="to" stringComparison="contains" value="to892"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-892-06 Allof condition', async () => { const a = await ca(); await cf(a, 'z892_06', '<headerTest header="subject" stringComparison="contains" value="892a"/><headerTest header="from" stringComparison="contains" value="892b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-892-07 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z892_07', '<headerTest header="subject" stringComparison="is" value="v892"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-893-01 Header is', async () => { const a = await ca(); await cf(a, 'z893_01', '<headerTest header="subject" stringComparison="is" value="zcs893"/>', '<actionKeep/>'); });
	it('Regression | ZCS-893-02 Header contains', async () => { const a = await ca(); await cf(a, 'z893_02', '<headerTest header="subject" stringComparison="contains" value="893p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-893-03 From filter', async () => { const a = await ca(); await cf(a, 'z893_03', '<headerTest header="from" stringComparison="is" value="from893@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-893-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z893_04', '<headerTest header="subject" stringComparison="is" value="v893"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
