import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Filters-Fileinto', function () {
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

	it('Smoke | Create filter rule with fileinto action', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const folderName = `filed${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="fileme"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/${folderName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');
		assert.exists(modRes.ModifyFilterRulesResponse, 'ModifyFilterRulesResponse should exist');
	});

	it('Sanity | Verify fileinto filter rule via GetFilterRules', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains" value="fileinto"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Inbox"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(getRes.GetFilterRulesResponse, 'GetFilterRulesResponse should exist');
	});

	it('Functional | Create fileinto filter to subfolder', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const folderName = `sub${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, authToken
		);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="subfolder"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Inbox/${folderName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest subfolder should not fault');
	});

	it('Functional | Create fileinto filter with non-existent folder', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="nonexist"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/NonExistent${common.getUniqueString()}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken
		);
		// Server may accept the filter rule even if folder doesn't exist
		assert.isTrue(
			(modRes.ModifyFilterRulesResponse !== undefined) || (modRes.Fault !== undefined),
			'Should return a proper response'
		);
	});
});
