import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > ApplyFilterRules > ApplyFilterRulesRequest-Basic', function () {
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
	it('Smoke | Basic ApplyFilterRulesRequest', async () => {
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


	it('Sanity | Use ApplyFilterRulesRequest with a query', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add matching message
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: ${filterSubject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMsgRequest should not fault');
		const msg1 = Array.isArray(addRes1.AddMsgResponse.m)
			? addRes1.AddMsgResponse.m[0] : addRes1.AddMsgResponse.m;
		const message1Id = msg1.id;

		// Add non-matching message
		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01B
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMsgRequest should not fault');

		// Create filter rule
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

		// Apply filter rules with query
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

		// Verify the matching message ID is in the response
		if (applyRes.ApplyFilterRulesResponse.m) {
			const m = Array.isArray(applyRes.ApplyFilterRulesResponse.m)
				? applyRes.ApplyFilterRulesResponse.m[0] : applyRes.ApplyFilterRulesResponse.m;
			const ids = m.ids || '';
			assert.include(ids, String(message1Id), 'Matching message ID should be in response');
		}
	});


	it('Sanity | Use ApplyFilterRulesRequest with a id list', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Add matching message
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: ${filterSubject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes1.Fault, 'AddMsgRequest should not fault');
		const msg1 = Array.isArray(addRes1.AddMsgResponse.m)
			? addRes1.AddMsgResponse.m[0] : addRes1.AddMsgResponse.m;
		const message1Id = msg1.id;

		// Add non-matching message
		const addRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01B
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes2.Fault, 'AddMsgRequest should not fault');
		const msg2 = Array.isArray(addRes2.AddMsgResponse.m)
			? addRes2.AddMsgResponse.m[0] : addRes2.AddMsgResponse.m;
		const message2Id = msg2.id;

		// Create filter rule
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

		// Apply filter rules with message ID list
		const applyRes = await soap.makeSOAPEnvelopeAccount(
			`<ApplyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}"/>
				</filterRules>
				<m ids="${message1Id},${message2Id}"/>
			</ApplyFilterRulesRequest>`, accountAuthToken
		);
		assert.notExists(applyRes.Fault, 'ApplyFilterRulesRequest should not fault');
		assert.exists(applyRes.ApplyFilterRulesResponse, 'ApplyFilterRulesResponse should exist');

		// Verify the matching message ID is in the response
		if (applyRes.ApplyFilterRulesResponse.m) {
			const m = Array.isArray(applyRes.ApplyFilterRulesResponse.m)
				? applyRes.ApplyFilterRulesResponse.m[0] : applyRes.ApplyFilterRulesResponse.m;
			const ids = m.ids || '';
			assert.include(ids, String(message1Id), 'Matching message ID should be in response');
		}
	});
});
