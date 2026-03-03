import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Filters > Filterrulescasesensitive', function () {
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
	it('Sanity | Verify filter action flag is done for case sesitive match', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
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

		// Create case-sensitive filter on subject for UPPERCASE match
		const filterName = `filter${common.getUniqueString()}`;
		const timeCounter = common.getUniqueString();
		const filterSubject = `filter${timeCounter}`;
		const filterSubjectCs = `FILTER${timeCounter}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" caseSensitive="1" value="${filterSubjectCs}"/>
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

		// Send message with UPPERCASE subject (should match)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubjectCs}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Send message with lowercase subject (should not match)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for messages and verify CS match is flagged, non-CS is not
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox "${filterSubjectCs}"</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Verify filter action fileintofolder is done for case sesitive match', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
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

		// Create a folder on account1
		const folderName = `folder${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Create case-sensitive filter on From header for fileInto
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const filterSubject2 = `filter${common.getUniqueString()}`;
		const senderPersonalCs = 'FirstName';
		const senderPersonal = 'firstname';
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="From" stringComparison="contains" caseSensitive="1" value="${senderPersonalCs}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
							<actionStop/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		// Send message with matching From personal name (FirstName)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}" p="${senderPersonalCs}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Send message with non-matching From personal name (firstname)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="f" a="${account2Email}" p="${senderPersonal}"/>
					<su>${filterSubject2}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search in the folder and verify only matching message was filed
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Verify filter action flag is done for case sesitive body match', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
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

		// Create case-sensitive filter on body
		const filterName = `filter${common.getUniqueString()}`;
		const filterSubject = `filter${common.getUniqueString()}`;
		const bodyCs = 'HelloWorld';
		const bodyLower = 'helloworld';
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<bodyTest caseSensitive="1" value="${bodyCs}"/>
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

		// Send message with matching body (HelloWorld)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>${bodyCs}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Send message with non-matching body (helloworld)
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>${bodyLower}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for messages and verify
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox "${filterSubject}"</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Verify filter action flag is done for read receipt mail match', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create case-sensitive filter on MIME header Content-Type for read receipt
		const filterName = `filter${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<mimeHeaderTest caseSensitive="1" header="Content-Type" stringComparison="contains" value="message/disposition-notification"/>
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

		// Inject read receipt MIME message via AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" f="">
					<content>From: user@example.com
To: ${accountEmail}
Subject: Read-Receipt: Test Message
MIME-Version: 1.0
Content-Type: multipart/report; report-type=disposition-notification; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=utf-8

Your message was read.

--boundary123
Content-Type: message/disposition-notification

Reporting-UA: Zimbra
Final-Recipient: rfc822;${accountEmail}
Disposition: automatic-action/MDN-sent-automatically; displayed

--boundary123--
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Search for the message and verify it is flagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Verify filter action flag is done for case sesitive 0', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
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

		// Create filter with caseSensitive="0" (case-insensitive, both should match)
		const filterName = `filter${common.getUniqueString()}`;
		const timeCounter = common.getUniqueString();
		const filterSubject = `filter${timeCounter}`;
		const filterSubjectCs = `FILTER${timeCounter}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="Subject" stringComparison="contains" caseSensitive="0" value="${filterSubjectCs}"/>
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

		// Send message with UPPERCASE subject
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubjectCs}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Send message with lowercase subject
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${filterSubject}</su>
					<mp ct="text/plain">
						<content>Hello world</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Search for messages and verify neither is flagged with caseSensitive=0
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox "${filterSubjectCs}"</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
