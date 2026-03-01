import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > Bugs > Bug72774', function () {
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
	it('Sanity | Verify redirect filter not causes Date header rewrite', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter
		const filterName = `filter${common.getUniqueString()}`;
		const subject = `subj${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		await common.delay(3000);

		// Verify message in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});
});
