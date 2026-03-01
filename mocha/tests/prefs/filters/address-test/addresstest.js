import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Filters > AddressTest > AddressTest', function () {
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
	it('Sanity | Verify filter action flag is done for case sensitive match for From field which contains Display name and email address', async () => {
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create filter with addressTest on From all part, case sensitive
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" stringComparison="is" caseSensitive="1" value="${account2}" part="all"/>
						</filterTests>
						<filterActions>
							<actionFlag flagName="flagged"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search and verify message is flagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:${account2}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const flagged = msgs.some(m => m.f && m.f.includes('f'));
		assert.isTrue(flagged, 'Message should be flagged');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sesitive match for local part of From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="localpart" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sesitive match for local part of From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="localpart" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sesitive match for local part of CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="localpart" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sesitive match for local part of CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="localpart" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sesitive match for local part To field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="localpart" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sesitive match for localpart of To field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="localpart" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive match for whole From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="all" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sensitive match for whole From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="all" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive match of whole To field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="all" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sensitive match for whole To field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="all" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive match of whole CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="all" stringComparison="contains" caseSensitive="1" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sensitive match of whole CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="all" stringComparison="contains" caseSensitive="0" value="test."/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive match doamin part of From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="domain" stringComparison="contains" caseSensitive="1" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sensitive doamin part match of From field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="From" part="domain" stringComparison="contains" caseSensitive="0" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive doamin part match of CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="domain" stringComparison="contains" caseSensitive="1" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for non-case sensitive doamin part match of CC field', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="CC" part="domain" stringComparison="contains" caseSensitive="0" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="c" a="${account2}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive doamin part match of To field 1', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="domain" stringComparison="contains" caseSensitive="1" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.m
			? (Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
			: [];
		const found = msgs.some(m => m.su === subject);
		assert.isTrue(found, 'Message should be in the folder');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sensitive doamin part match of To field 2', async () => {
		// Create accounts
		const account1 = `test.${common.getUniqueString()}@${testDomain}`;
		const account2 = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken1 = await soap.getAccountAuthToken(account1);
		const authToken2 = await soap.getAccountAuthToken(account2);

		// Create folder
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, authToken1
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter with addressTest
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<addressTest header="To" part="domain" stringComparison="contains" caseSensitive="0" value="soapdomain"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, authToken1
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message from account2 to account1
		const subject = `subj${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1}"/>
					<e t="f" a="${account2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken2
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await common.delay(5000);

		// Search in folder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, authToken1
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
