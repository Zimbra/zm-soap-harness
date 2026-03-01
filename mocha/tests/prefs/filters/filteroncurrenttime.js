import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Filters > FilterOnCurrentTime', function () {
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
	it('Sanity | Filter the mail received after specific time based of users default timezone 1', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with currentTimeTest "after" (2 minutes ago)
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const now = new Date();
		const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);
		const timeVal = String(twoMinAgo.getUTCHours()).padStart(2, '0')
			+ String(twoMinAgo.getUTCMinutes()).padStart(2, '0');
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="after" time="${timeVal}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		assert.match(msgs[0].f || '', /f/, 'Message should be flagged');
	});


	it('Sanity | Filter the mail received after specific time based of users default timezone 2', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with currentTimeTest "before" (2 minutes in future)
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const now = new Date();
		const twoMinFuture = new Date(now.getTime() + 2 * 60 * 1000);
		const timeVal = String(twoMinFuture.getUTCHours()).padStart(2, '0')
			+ String(twoMinFuture.getUTCMinutes()).padStart(2, '0');
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="${timeVal}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		assert.match(msgs[0].f || '', /f/, 'Message should be flagged');
	});


	it('Sanity | Filter the mail received between specific time based of users default timezone', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with currentTimeTest "between" (after -2min AND before +2min)
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const now = new Date();
		const twoMinFuture = new Date(now.getTime() + 2 * 60 * 1000);
		const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000);
		const beforeTime = String(twoMinFuture.getUTCHours()).padStart(2, '0')
			+ String(twoMinFuture.getUTCMinutes()).padStart(2, '0');
		const afterTime = String(twoMinAgo.getUTCHours()).padStart(2, '0')
			+ String(twoMinAgo.getUTCMinutes()).padStart(2, '0');
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="allof">
							<currentTimeTest dateComparison="before" time="${beforeTime}"/>
							<currentTimeTest dateComparison="after" time="${afterTime}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		assert.match(msgs[0].f || '', /f/, 'Message should be flagged');
	});


	it('Functional | Filter the mail received after specific time based of users default timezone 3', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with time window that does NOT include current time
		// (before -1min AND after +2min → impossible window, should not flag)
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const now = new Date();
		const oneMinAgo = new Date(now.getTime() - 1 * 60 * 1000);
		const twoMinFuture = new Date(now.getTime() + 2 * 60 * 1000);
		const beforeTime = String(oneMinAgo.getUTCHours()).padStart(2, '0')
			+ String(oneMinAgo.getUTCMinutes()).padStart(2, '0');
		const afterTime = String(twoMinFuture.getUTCHours()).padStart(2, '0')
			+ String(twoMinFuture.getUTCMinutes()).padStart(2, '0');
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="allof">
							<currentTimeTest dateComparison="before" time="${beforeTime}"/>
							<currentTimeTest dateComparison="after" time="${afterTime}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is NOT flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		const flags = msgs[0].f || '';
		assert.notMatch(flags, /f/, 'Message should not be flagged');
	});


	it('Sanity | Filter the mail received on specific weekday 1', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with currentDayOfWeekTest for today's weekday
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const today = new Date().getUTCDay();
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="allof">
							<currentDayOfWeekTest value="${today}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		assert.match(msgs[0].f || '', /f/, 'Message should be flagged');
	});


	it('Sanity | Filter the mail received on specific weekday 2', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Create filter with currentDayOfWeekTest for 2 days before and after today
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const today = new Date().getUTCDay();
		const twoDaysAfter = (today + 2) % 7;
		const twoDaysBefore = (today + 5) % 7;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="allof">
							<currentDayOfWeekTest value="${twoDaysAfter},${twoDaysBefore}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');

		// Send message from account2 to account1
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>simple text string in the body</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for the message and verify it is NOT flagged
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${filterSubject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should exist');
		const flags = msgs[0].f || '';
		assert.notMatch(flags, /f/, 'Message should not be flagged');
	});


	it('Regression | Verify Filter Rule on Date Time throws error on invalid value', async () => {
		// Create account with UTC timezone
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefTimeZoneId">UTC</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const filterName = `filter${common.getUniqueString()}`;

		// Verify invalid time value "2400" returns fault
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="2400"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res1.Fault, 'Time 2400 should return fault');
		assert.match(res1.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid time value "2400" with "after" returns fault
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="after" time="2400"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res2.Fault, 'Time 2400 after should return fault');
		assert.match(res2.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid dateComparison "later" returns fault
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="later" time="2400"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res3.Fault, 'Invalid comparison "later" should return fault');
		assert.match(res3.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid time value "2900" returns fault
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="2900"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res4.Fault, 'Time 2900 should return fault');
		assert.match(res4.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid time value "2298" returns fault
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="2298"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res5.Fault, 'Time 2298 should return fault');
		assert.match(res5.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify negative time value "-1020" returns fault
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="-1020"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res6.Fault, 'Negative time should return fault');
		assert.match(res6.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify very large time value "140000" returns fault
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="140000"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res7.Fault, 'Large time value should return fault');
		assert.match(res7.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify very small time value "54" returns fault
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="54"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res8.Fault, 'Time 54 should return fault');
		assert.match(res8.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify non-numeric time value "a" returns fault
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentTimeTest dateComparison="before" time="a"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res9.Fault, 'Non-numeric time should return fault');
		assert.match(res9.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid day of week value "-1" returns fault
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentDayOfWeekTest value="-1"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res10.Fault, 'Day of week -1 should return fault');
		assert.match(res10.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid day of week value "1,3,8" returns fault
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentDayOfWeekTest value="1,3,8"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res11.Fault, 'Day of week 1,3,8 should return fault');
		assert.match(res11.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify invalid day of week value "11,-02" returns fault
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentDayOfWeekTest value="11,-02"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res12.Fault, 'Day of week 11,-02 should return fault');
		assert.match(res12.Fault.Detail.Error.Code, /^service/, 'Should be a service error');

		// Verify non-numeric day of week value "a,b,c" returns fault
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<currentDayOfWeekTest value="a,b,c"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken, false
		);
		assert.exists(res13.Fault, 'Non-numeric day of week should return fault');
		assert.match(res13.Fault.Detail.Error.Code, /^service/, 'Should be a service error');
	});
});
