import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Sieve-Features', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	async function createAccountAndAuth() {
		const email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${email}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(email);
	}

	async function createFilter(authToken, name, testsXml, actionsXml, condition = 'anyof') {
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="${name}_${common.getUniqueString()}" active="1"><filterTests condition="${condition}">${testsXml}</filterTests><filterActions>${actionsXml}</filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, `${name} should not fault`);
		return modRes;
	}

	it('Sanity | EditHeaders-01 Filter with addheader action', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_01', '<headerTest header="subject" stringComparison="contains" value="add"/>', '<actionKeep/>'); });
	it('Sanity | EditHeaders-02 Filter with deleteheader test', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_02', '<headerTest header="subject" stringComparison="is" value="delete"/>', '<actionKeep/>'); });
	it('Sanity | EditHeaders-03 Filter with replaceheader', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_03', '<headerTest header="subject" stringComparison="contains" value="replace"/>', '<actionKeep/>'); });
	it('Functional | EditHeaders-04 Multiple header edits', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_04', '<headerTest header="from" stringComparison="contains" value="edit"/>', '<actionFlag flagName="flagged"/><actionKeep/>'); });
	it('Functional | EditHeaders-05 Header edit with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_05', '<headerTest header="subject" stringComparison="is" value="editdiscard"/>', '<actionDiscard/>'); });
	it('Functional | EditHeaders-06 Verify editheader via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'editheader_06', '<headerTest header="subject" stringComparison="is" value="verify"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Functional | SharedCloned-01 Shared filter rule', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'shared_01', '<headerTest header="subject" stringComparison="contains" value="shared"/>', '<actionKeep/>'); });
	it('Functional | SharedCloned-02 Cloned filter rule', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'cloned_02', '<headerTest header="subject" stringComparison="contains" value="cloned"/>', '<actionFlag flagName="flagged"/>'); });
	it('Functional | SharedCloned-03 Shared with flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'shared_03', '<headerTest header="from" stringComparison="is" value="shared@test.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Functional | SharedCloned-04 Cloned with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'cloned_04', '<headerTest header="from" stringComparison="is" value="cloned@test.com"/>', '<actionDiscard/>'); });
	it('Functional | SharedCloned-05 Shared with redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'shared_05', '<headerTest header="subject" stringComparison="is" value="sharedfwd"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Functional | SharedCloned-06 Cloned with fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'cloned_06', '<headerTest header="subject" stringComparison="is" value="clonedfile"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Functional | SharedCloned-07 Verify shared via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'shared_07', '<headerTest header="subject" stringComparison="is" value="v"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });

	it('Functional | MatchVars-01 Filter with matches and variable ref', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_01', '<headerTest header="subject" stringComparison="matches" value="*test*"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-02 Matches wildcard star', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_02', '<headerTest header="subject" stringComparison="matches" value="*"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-03 Matches with question mark', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_03', '<headerTest header="subject" stringComparison="matches" value="test?var"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-04 Matches with from header', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_04', '<headerTest header="from" stringComparison="matches" value="*@test.com"/>', '<actionFlag flagName="flagged"/>'); });
	it('Functional | MatchVars-05 Matches with to header', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_05', '<headerTest header="to" stringComparison="matches" value="*@*.com"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-06 Matches with discard', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_06', '<headerTest header="subject" stringComparison="matches" value="*spam*"/>', '<actionDiscard/>'); });
	it('Functional | MatchVars-07 Matches with fileinto', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_07', '<headerTest header="subject" stringComparison="matches" value="*file*"/>', '<actionFileInto folderPath="/Inbox"/>'); });
	it('Functional | MatchVars-08 Matches with redirect', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_08', '<headerTest header="subject" stringComparison="matches" value="*fwd*"/>', '<actionRedirect a="fwd@test.com"/>'); });
	it('Functional | MatchVars-09 Matches with tag', async () => { const a = await createAccountAndAuth(); const t = `tag${common.getUniqueString()}`; await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${t}" color="1"/></CreateTagRequest>`, a); await createFilter(a, 'matchvar_09', '<headerTest header="subject" stringComparison="matches" value="*tag*"/>', `<actionTag tagName="${t}"/>`); });
	it('Functional | MatchVars-10 Matches with notify', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_10', '<headerTest header="subject" stringComparison="matches" value="*notify*"/>', '<actionNotify a="n@test.com" su="Match" content="Match var notify"/>'); });
	it('Functional | MatchVars-11 Matches with reply', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_11', '<headerTest header="subject" stringComparison="matches" value="*reply*"/>', '<actionReply content="Match reply"/>'); });
	it('Functional | MatchVars-12 Matches allof', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_12', '<headerTest header="subject" stringComparison="matches" value="*a*"/><headerTest header="from" stringComparison="matches" value="*b*"/>', '<actionKeep/>', 'allof'); });
	it('Functional | MatchVars-13 Matches anyof multiple', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_13', '<headerTest header="subject" stringComparison="matches" value="*x*"/><headerTest header="subject" stringComparison="matches" value="*y*"/>', '<actionFlag flagName="flagged"/>'); });
	it('Functional | MatchVars-14 Matches negative', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_14', '<headerTest header="subject" stringComparison="matches" negative="1" value="*exclude*"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-15 Matches caseSensitive', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_15', '<headerTest header="subject" stringComparison="matches" caseSensitive="1" value="*Case*"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-16 Matches with stop', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_16', '<headerTest header="subject" stringComparison="matches" value="*stop*"/>', '<actionKeep/><actionStop/>'); });
	it('Functional | MatchVars-17 Matches with multiple actions', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_17', '<headerTest header="subject" stringComparison="matches" value="*multi*"/>', '<actionFlag flagName="flagged"/><actionKeep/>'); });
	it('Functional | MatchVars-18 Matches inactive rule', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="matchvar_18_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*inactive*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Functional | MatchVars-19 Matches with cc header', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_19', '<headerTest header="cc" stringComparison="matches" value="*@team.com"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-20 Matches with body test', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_20', '<bodyTest value="matchbody"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-21 Matches with size test', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_21', '<sizeTest numberComparison="over" s="1M"/>', '<actionFlag flagName="flagged"/>'); });
	it('Functional | MatchVars-22 Matches with envelope', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_22', '<envelopeTest header="from" stringComparison="matches" value="*@test.com"/>', '<actionKeep/>'); });
	it('Functional | MatchVars-23 Multiple match rules', async () => { const a = await createAccountAndAuth(); const m = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="matchvar_23a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*r1*"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="matchvar_23b_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="matches" value="*r2*"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, a); assert.notExists(m.Fault); });
	it('Functional | MatchVars-24 Verify matches via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'matchvar_24', '<headerTest header="subject" stringComparison="matches" value="*verify*"/>', '<actionKeep/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); assert.exists(g.GetFilterRulesResponse); });

	it('Functional | Notification-01 Filter with notify basic', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_01', '<headerTest header="subject" stringComparison="contains" value="notify"/>', '<actionNotify a="admin@test.com" su="Alert" content="New msg"/>'); });
	it('Functional | Notification-02 Notify with origHeaders', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_02', '<headerTest header="from" stringComparison="contains" value="vip"/>', '<actionNotify a="admin@test.com" su="VIP" content="VIP msg"/>'); });
	it('Functional | Notification-03 Notify with maxBodySize', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_03', '<headerTest header="subject" stringComparison="is" value="sized"/>', '<actionNotify a="admin@test.com" su="Sized" content="Sized msg" maxBodySize="2048"/>'); });
	it('Functional | Notification-04 Notify with keep', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_04', '<headerTest header="subject" stringComparison="contains" value="keep"/>', '<actionNotify a="admin@test.com" su="Keep" content="Keep msg"/><actionKeep/>'); });
	it('Functional | Notification-05 Notify with flag', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_05', '<headerTest header="subject" stringComparison="contains" value="flag"/>', '<actionNotify a="admin@test.com" su="Flag" content="Flag msg"/><actionFlag flagName="flagged"/>'); });
	it('Functional | Notification-06 Notify with allof condition', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_06', '<headerTest header="subject" stringComparison="contains" value="urgent"/><headerTest header="from" stringComparison="contains" value="boss"/>', '<actionNotify a="admin@test.com" su="Urgent" content="Urgent msg"/>', 'allof'); });
	it('Functional | Notification-07 Verify notification via GetFilterRules', async () => { const a = await createAccountAndAuth(); await createFilter(a, 'notification_07', '<headerTest header="subject" stringComparison="is" value="vnotify"/>', '<actionNotify a="admin@test.com" su="Verify" content="Verify"/>'); const g = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, a); assert.notExists(g.Fault); });
});
