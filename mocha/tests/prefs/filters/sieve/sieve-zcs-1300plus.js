import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Sieve > Sieve ZCS 1300plus', function () {
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

	it('Regression | ZCS-1378-01 Reset vars between filters', async () => { const a = await ca(); await cf(a, 'z1378_01', '<headerTest header="subject" stringComparison="is" value="reset1378"/>', '<actionKeep/>'); });

	it('Regression | ZCS-1390-01 SOAP to Sieve header is', async () => { const a = await ca(); await cf(a, 'z1390_01', '<headerTest header="subject" stringComparison="is" value="s2s1390"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1390-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1390_02', '<headerTest header="subject" stringComparison="contains" value="1390p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1390-03 Header matches', async () => { const a = await ca(); await cf(a, 'z1390_03', '<headerTest header="subject" stringComparison="matches" value="*1390*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1390-04 From filter', async () => { const a = await ca(); await cf(a, 'z1390_04', '<headerTest header="from" stringComparison="is" value="from1390@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1390-05 Allof condition', async () => { const a = await ca(); await cf(a, 'z1390_05', '<headerTest header="subject" stringComparison="contains" value="1390a"/><headerTest header="from" stringComparison="contains" value="1390b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-1390-06 Negative test', async () => { const a = await ca(); await cf(a, 'z1390_06', '<headerTest header="subject" stringComparison="is" negative="1" value="no1390"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1390-07 Multiple actions', async () => { const a = await ca(); await cf(a, 'z1390_07', '<headerTest header="subject" stringComparison="contains" value="multi1390"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-1390-08 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1390_08', '<headerTest header="subject" stringComparison="is" value="v1390"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1591-01 FileInto filter', async () => { const a = await ca(); await cf(a, 'z1591_01', '<headerTest header="subject" stringComparison="is" value="fileinto1591"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-1591-02 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1591_02', '<headerTest header="subject" stringComparison="is" value="v1591"/>', '<actionFileInto folderPath="/Inbox"/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1845-01 Header is', async () => { const a = await ca(); await cf(a, 'z1845_01', '<headerTest header="subject" stringComparison="is" value="zcs1845"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1845-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1845_02', '<headerTest header="subject" stringComparison="contains" value="1845p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1845-03 Header with discard', async () => { const a = await ca(); await cf(a, 'z1845_03', '<headerTest header="subject" stringComparison="is" value="dis1845"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1845-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1845_04', '<headerTest header="subject" stringComparison="is" value="v1845"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1850-01 Header is', async () => { const a = await ca(); await cf(a, 'z1850_01', '<headerTest header="subject" stringComparison="is" value="zcs1850"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1850-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1850_02', '<headerTest header="subject" stringComparison="contains" value="1850p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1850-03 Header matches', async () => { const a = await ca(); await cf(a, 'z1850_03', '<headerTest header="subject" stringComparison="matches" value="*1850*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1850-04 From filter', async () => { const a = await ca(); await cf(a, 'z1850_04', '<headerTest header="from" stringComparison="is" value="from1850@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1850-05 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1850_05', '<headerTest header="subject" stringComparison="is" value="v1850"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-1858-01 Header is', async () => { const a = await ca(); await cf(a, 'z1858_01', '<headerTest header="subject" stringComparison="is" value="zcs1858"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1858-02 Header contains', async () => { const a = await ca(); await cf(a, 'z1858_02', '<headerTest header="subject" stringComparison="contains" value="1858p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-1858-03 Header matches', async () => { const a = await ca(); await cf(a, 'z1858_03', '<headerTest header="subject" stringComparison="matches" value="*1858*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-1858-04 From filter', async () => { const a = await ca(); await cf(a, 'z1858_04', '<headerTest header="from" stringComparison="is" value="from1858@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-1858-05 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z1858_05', '<headerTest header="subject" stringComparison="is" value="v1858"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-2388-01 Filter edge case', async () => { const a = await ca(); await cf(a, 'z2388_01', '<headerTest header="subject" stringComparison="is" value="zcs2388"/>', '<actionKeep/>'); });
	it('Regression | ZCS-2388-02 Header with flag', async () => { const a = await ca(); await cf(a, 'z2388_02', '<headerTest header="subject" stringComparison="contains" value="2388f"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-2388-03 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z2388_03', '<headerTest header="subject" stringComparison="is" value="v2388"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-2473-01 Matches for malencoded header', async () => { const a = await ca(); await cf(a, 'z2473_01', '<headerTest header="subject" stringComparison="matches" value="*malenc*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-2473-02 Malencoded with flag', async () => { const a = await ca(); await cf(a, 'z2473_02', '<headerTest header="subject" stringComparison="contains" value="malenc"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-2473-03 Malencoded with discard', async () => { const a = await ca(); await cf(a, 'z2473_03', '<headerTest header="subject" stringComparison="is" value="malencdis"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-2473-04 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z2473_04', '<headerTest header="subject" stringComparison="is" value="v2473"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Regression | ZCS-2725-01 Header is', async () => { const a = await ca(); await cf(a, 'z2725_01', '<headerTest header="subject" stringComparison="is" value="zcs2725"/>', '<actionKeep/>'); });
	it('Regression | ZCS-2725-02 Header contains', async () => { const a = await ca(); await cf(a, 'z2725_02', '<headerTest header="subject" stringComparison="contains" value="2725p"/>', '<actionFlag flagName="flagged"/>'); });
	it('Regression | ZCS-2725-03 Header matches', async () => { const a = await ca(); await cf(a, 'z2725_03', '<headerTest header="subject" stringComparison="matches" value="*2725*"/>', '<actionKeep/>'); });
	it('Regression | ZCS-2725-04 From filter', async () => { const a = await ca(); await cf(a, 'z2725_04', '<headerTest header="from" stringComparison="is" value="from2725@t.com"/>', '<actionDiscard/>'); });
	it('Regression | ZCS-2725-05 To filter', async () => { const a = await ca(); await cf(a, 'z2725_05', '<headerTest header="to" stringComparison="contains" value="to2725"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Regression | ZCS-2725-06 Redirect', async () => { const a = await ca(); await cf(a, 'z2725_06', '<headerTest header="subject" stringComparison="is" value="fwd2725"/>', '<actionRedirect a="f@t.com"/>'); });
	it('Regression | ZCS-2725-07 Allof condition', async () => { const a = await ca(); await cf(a, 'z2725_07', '<headerTest header="subject" stringComparison="contains" value="2725a"/><headerTest header="from" stringComparison="contains" value="2725b"/>', '<actionKeep/>', 'allof'); });
	it('Regression | ZCS-2725-08 Negative test', async () => { const a = await ca(); await cf(a, 'z2725_08', '<headerTest header="subject" stringComparison="is" negative="1" value="no2725"/>', '<actionKeep/>'); });
	it('Regression | ZCS-2725-09 Multiple actions', async () => { const a = await ca(); await cf(a, 'z2725_09', '<headerTest header="subject" stringComparison="contains" value="multi2725"/>', '<actionFlag flagName="flagged"/><actionKeep/><actionStop/>'); });
	it('Regression | ZCS-2725-10 Verify via GetFilterRules', async () => { const a = await ca(); await cf(a, 'z2725_10', '<headerTest header="subject" stringComparison="is" value="v2725"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
