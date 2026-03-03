import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Bugs > Bug 66704', function () {
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
	it('Sanity | Creating a rule without action -- greater than serviceINVALIDREQUEST', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		const subject = `subj${common.getUniqueString()}`;

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject}"/>
						</filterTests>
						<filterActions></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.isString(modRes.Fault.Detail.Error.Code, 'Request should fault with INVALID_REQUEST');
		const code = modRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be INVALID_REQUEST');
	});


	it('Sanity | Creating a rule with blank attribute value for any action -- greater than serviceINVALIDREQUEST', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		const subject = `subj${common.getUniqueString()}`;

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject}"/>
						</filterTests>
						<filterActions><actionFileInto folderPath=""></actionFileInto></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.isString(modRes.Fault.Detail.Error.Code, 'Request should fault with INVALID_REQUEST');
		const code = modRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be INVALID_REQUEST');
	});


	it('Sanity | Creating a rule with blank value for any action -- greater than serviceINVALIDREQUEST', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		const subject = `subj${common.getUniqueString()}`;

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="0">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject}"/>
						</filterTests>
						<filterActions><actionKeep_invalid/></filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.isString(modRes.Fault.Detail.Error.Code, 'Request should fault with INVALID_REQUEST');
		const code = modRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be INVALID_REQUEST');
	});
});
