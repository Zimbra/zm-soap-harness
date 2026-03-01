import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Sieve-Bugs-106xxx-1', function () {
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
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(accountEmail);
	}

	it('Regression | Bug106349-01 Filter with size under test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106349_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="under" s="100K"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106349-01 should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'Response should exist');
	});

	it('Regression | Bug106349-02 Filter with size over test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106349_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="over" s="5M"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106349-02 should not fault');
	});

	it('Regression | Bug106349-03 Size test with flag action', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106349_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="over" s="1M"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106349-03 should not fault');
	});

	it('Regression | Bug106349-04 Size test with redirect', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106349_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="under" s="50K"/></filterTests><filterActions><actionRedirect a="small@test.com"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106349-04 should not fault');
	});

	it('Regression | Bug106349-05 Verify size filter via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106349_05_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><sizeTest numberComparison="over" s="10M"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106350-01 Filter with date before test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-01 should not fault');
	});

	it('Regression | Bug106350-02 Filter with date after test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="after" d="${Math.floor(Date.now() / 1000) - 86400}"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-02 should not fault');
	});

	it('Regression | Bug106350-03 Date test with discard', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000) - 172800}"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-03 should not fault');
	});

	it('Regression | Bug106350-04 Date test with fileinto', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="after" d="${Math.floor(Date.now() / 1000) - 604800}"/></filterTests><filterActions><actionFileInto folderPath="/Inbox"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-04 should not fault');
	});

	it('Regression | Bug106350-05 Date test with allof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_05_${common.getUniqueString()}" active="1"><filterTests condition="allof"><dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/><headerTest header="subject" stringComparison="contains" value="old"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-05 should not fault');
	});

	it('Regression | Bug106350-06 Date test with notify', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_06_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="after" d="${Math.floor(Date.now() / 1000) - 3600}"/></filterTests><filterActions><actionNotify a="admin@test.com" su="Date Alert" content="Date notification"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106350-06 should not fault');
	});

	it('Regression | Bug106350-07 Verify date filter via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106350_07_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><dateTest dateComparison="before" d="${Math.floor(Date.now() / 1000)}"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106637-01 Filter with currentDayOfWeek test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106637_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><currentDayOfWeekTest value="0,1,2,3,4"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106637-01 should not fault');
	});

	it('Regression | Bug106637-02 CurrentDayOfWeek with flag action', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106637_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><currentDayOfWeekTest value="5,6"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106637-02 should not fault');
	});

	it('Regression | Bug106637-03 Verify currentDayOfWeek via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106637_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><currentDayOfWeekTest value="0,1,2,3,4,5,6"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106838-01 Filter with currentTime test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106838_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><currentTimeTest dateComparison="before" time="2359"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106838-01 should not fault');
	});


	it('Regression | Bug106845-01 Filter with attachment exists test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106845_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><attachmentTest/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106845-01 should not fault');
	});

	it('Regression | Bug106845-02 Attachment test with fileinto', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106845_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><attachmentTest/></filterTests><filterActions><actionFileInto folderPath="/Inbox"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106845-02 should not fault');
	});

	it('Regression | Bug106845-03 Attachment test with discard', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106845_03_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><attachmentTest/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106845-03 should not fault');
	});

	it('Regression | Bug106845-04 Attachment test allof with header', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106845_04_${common.getUniqueString()}" active="1"><filterTests condition="allof"><attachmentTest/><headerTest header="subject" stringComparison="contains" value="report"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106845-04 should not fault');
	});

	it('Regression | Bug106845-05 Verify attachment filter via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106845_05_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><attachmentTest/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Regression | Bug106846-01 Filter with invitation test', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106846_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><inviteTest><method>anyrequest</method></inviteTest></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106846-01 should not fault');
	});


	it('Regression | Bug106870-01 Multiple filter conditions combined', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_01_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="a"/><headerTest header="from" stringComparison="contains" value="b"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-01 should not fault');
	});

	it('Regression | Bug106870-02 Three header conditions anyof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_02_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="x"/><headerTest header="from" stringComparison="is" value="y@test.com"/><headerTest header="to" stringComparison="is" value="z@test.com"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-02 should not fault');
	});

	it('Regression | Bug106870-03 Three header conditions allof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_03_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="meeting"/><headerTest header="from" stringComparison="contains" value="boss"/><headerTest header="to" stringComparison="contains" value="team"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-03 should not fault');
	});

	it('Regression | Bug106870-04 Mixed condition types anyof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_04_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="test"/><sizeTest numberComparison="over" s="1M"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-04 should not fault');
	});

	it('Regression | Bug106870-05 Mixed condition types allof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_05_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="from" stringComparison="contains" value="sender"/><attachmentTest/><bodyTest value="content"/></filterTests><filterActions><actionDiscard/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-05 should not fault');
	});

	it('Regression | Bug106870-06 Header and size allof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_06_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="large"/><sizeTest numberComparison="over" s="5M"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-06 should not fault');
	});

	it('Regression | Bug106870-07 Multiple rules with mixed conditions', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_07a_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="rule1"/></filterTests><filterActions><actionKeep/></filterActions></filterRule><filterRule name="bug106870_07b_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="from" stringComparison="is" value="rule2@test.com"/><sizeTest numberComparison="under" s="100K"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-07 should not fault');
	});

	it('Regression | Bug106870-08 Negative condition with other tests', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_08_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" negative="1" value="spam"/><headerTest header="from" stringComparison="contains" value="trusted"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-08 should not fault');
	});

	it('Regression | Bug106870-09 Envelope and header combined', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_09_${common.getUniqueString()}" active="1"><filterTests condition="allof"><envelopeTest header="from" stringComparison="contains" value="test"/><headerTest header="subject" stringComparison="is" value="combined"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-09 should not fault');
	});

	it('Regression | Bug106870-10 Address and body combined', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_10_${common.getUniqueString()}" active="1"><filterTests condition="allof"><addressTest header="from" stringComparison="is" value="sender@test.com"/><bodyTest value="keyword"/></filterTests><filterActions><actionFlag flagName="flagged"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-10 should not fault');
	});

	it('Regression | Bug106870-11 Four conditions anyof', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_11_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="contains" value="a"/><headerTest header="from" stringComparison="contains" value="b"/><headerTest header="to" stringComparison="contains" value="c"/><headerTest header="cc" stringComparison="contains" value="d"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-11 should not fault');
	});

	it('Regression | Bug106870-12 Combined with tag action', async () => {
		const authToken = await createAccountAndAuth();
		const tagName = `tag${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(`<CreateTagRequest xmlns="urn:zimbraMail"><tag name="${tagName}" color="2"/></CreateTagRequest>`, authToken);
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_12_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="tag"/><attachmentTest/></filterTests><filterActions><actionTag tagName="${tagName}"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-12 should not fault');
	});

	it('Regression | Bug106870-13 Combined with redirect', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_13_${common.getUniqueString()}" active="1"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="forward"/><headerTest header="from" stringComparison="is" value="fwd@test.com"/></filterTests><filterActions><actionRedirect a="dest@test.com"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-13 should not fault');
	});

	it('Regression | Bug106870-14 Combined with multiple actions', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_14_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="contains" value="important"/><headerTest header="from" stringComparison="contains" value="boss"/></filterTests><filterActions><actionFlag flagName="flagged"/><actionKeep/><actionStop/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-14 should not fault');
	});

	it('Regression | Bug106870-15 Combined with inactive status', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_15_${common.getUniqueString()}" active="0"><filterTests condition="anyof"><headerTest header="subject" stringComparison="is" value="inactive"/><bodyTest value="inactive"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-15 should not fault');
	});

	it('Regression | Bug106870-16 Combined with notify', async () => {
		const authToken = await createAccountAndAuth();
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_16_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="from" stringComparison="is" value="alert@test.com"/><headerTest header="subject" stringComparison="contains" value="alert"/></filterTests><filterActions><actionNotify a="admin@test.com" su="Combined Alert" content="Combined notification"/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		assert.notExists(modRes.Fault, 'Bug106870-16 should not fault');
	});

	it('Regression | Bug106870-17 Verify combined filters via GetFilterRules', async () => {
		const authToken = await createAccountAndAuth();
		await soap.makeSOAPEnvelopeAccount(`<ModifyFilterRulesRequest xmlns="urn:zimbraMail"><filterRules><filterRule name="bug106870_17_${common.getUniqueString()}" active="1"><filterTests condition="allof"><headerTest header="subject" stringComparison="is" value="verify"/><sizeTest numberComparison="under" s="1M"/></filterTests><filterActions><actionKeep/></filterActions></filterRule></filterRules></ModifyFilterRulesRequest>`, authToken);
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'Response should exist');
	});
});
