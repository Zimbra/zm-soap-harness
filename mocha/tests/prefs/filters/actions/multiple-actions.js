import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Actions > Multiple Actions', function () {
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
	it('Functional | Create filter with multiple actions (flag + fileinto)', async () => {
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

		const folderName = `multi${common.getUniqueString()}`;

		// Create a folder
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="multiaction"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionFileInto folderPath="/${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest multiple actions should not fault');

		// Get filter rules
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Functional | Create filter with tag + redirect + keep actions', async () => {
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

		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;

		// Modify filter rules
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="combo"/>
						</filterTests>
						<filterActions>
							<actionTag tagName="${tagName}"/>
							<actionRedirect a="other@example.com"/>
							<actionKeep/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest combo actions should not fault');
	});
});
