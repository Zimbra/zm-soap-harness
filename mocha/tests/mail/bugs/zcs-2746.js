import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > ZCS 2746', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let account1Email, account2Email, account3Email, account1Id;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		account3Email = `account3.${common.getUniqueString()}@${testDomain}`;

		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureMarkMailForwardedAsRead">TRUE</a>
				<a n="zimbraPrefMailForwardingAddress">${account3Email}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Sanity | Forwarded messages are mark read if zimbraFeatureMarkMailForwardedAsRead is TRUE', async () => {
		const subject = `subject1.${common.getUniqueString()}`;
		const content = `content1.${common.getUniqueString()}`;

		// User2 sends mail to user1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content> ${content} </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Verify on user1 the mail is marked as read
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const search1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:read</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(search1Res.Fault, 'SearchRequest should not fault');

		// Verify on user3 the forwarded mail is received unread
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:unread subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Forwarded messages are unread if zimbraFeatureMarkMailForwardedAsRead is FALSE', async () => {
		const subject = `subject2.${common.getUniqueString()}`;
		const content = `content2.${common.getUniqueString()}`;

		// Set zimbraFeatureMarkMailForwardedAsRead to FALSE
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraFeatureMarkMailForwardedAsRead">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// User2 sends mail to user1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content> ${content} </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Verify on user1 the mail is marked as unread
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const search1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:unread subject:(${subject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(search1Res.Fault, 'SearchRequest should not fault');

		// Verify on user3 the forwarded mail is received unread
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:unread subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Forwarded messages marked as read in custom folder with filter', async () => {
		const subject = `subject3.${common.getUniqueString()}`;
		const content = `content3.${common.getUniqueString()}`;
		const folderName = `folder1.${common.getUniqueString()}`;

		// Set zimbraFeatureMarkMailForwardedAsRead back to TRUE
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraFeatureMarkMailForwardedAsRead">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// User1 creates folder and filter
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');

		// Create filter to move to custom folder
		const filterName = `filter_name1${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="contains"
								value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="${folderName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account1AuthToken
		);

		// User2 sends mail to user1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content> ${content} </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Verify on user1 the mail is marked as read in custom folder
		const account1AuthToken2 = await soap.getAccountAuthToken(account1Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName} is:read subject:${subject}</query>
			</SearchRequest>`, account1AuthToken2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
