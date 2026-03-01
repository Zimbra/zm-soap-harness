import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Filters > FilterRulesRequest', function () {
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
	it('Smoke | Smoke test for ModifyFilterRulesRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a filter rule
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" value="${filterSubject}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});


	it('Smoke | Smoke test for GetFilterRulesRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a filter first
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" value="${filterSubject}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);

		// Get filter rules and verify the created rule exists
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
		const rules = getRes.GetFilterRulesResponse.filterRules;
		assert.exists(rules, 'filterRules should exist');
	});


	it('Smoke | Smoke test for ApplyFilterRulesRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a filter rule
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" value="${filterSubject}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, accountAuthToken
		);

		// Apply filter rules
		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}"/>
				</filterRules>
				<query>in:inbox</query>
			</ApplyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(applyRes.Fault, 'ApplyFilterRulesRequest should not fault');
		assert.exists(applyRes.ApplyFilterRulesResponse, 'ApplyFilterRulesResponse should exist');
	});


	it('Smoke | Smoke test for ModifyOutgoingFilterRulesRequest and GetOutgoingFilterRulesRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create an outgoing filter rule
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" value="${filterSubject}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyOutgoingFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyOutgoingFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyOutgoingFilterRulesResponse,
			'ModifyOutgoingFilterRulesResponse should exist');

		// Get outgoing filter rules and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetOutgoingFilterRulesRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetOutgoingFilterRulesRequest should not fault');
		assert.exists(getRes.GetOutgoingFilterRulesResponse,
			'GetOutgoingFilterRulesResponse should exist');
	});


	it('Smoke | Smoke test for ApplyOutgoingFilterRulesRequest', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create an outgoing filter rule
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyOutgoingFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" value="${filterSubject}"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyOutgoingFilterRulesRequest>`, accountAuthToken
		);

		// Apply outgoing filter rules
		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyOutgoingFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}"/>
				</filterRules>
				<query>in:sent</query>
			</ApplyOutgoingFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(applyRes.Fault, 'ApplyOutgoingFilterRulesRequest should not fault');
		assert.exists(applyRes.ApplyOutgoingFilterRulesResponse,
			'ApplyOutgoingFilterRulesResponse should exist');
	});
});
