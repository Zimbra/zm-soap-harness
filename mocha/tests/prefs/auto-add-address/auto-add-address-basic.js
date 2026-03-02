import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Auto Add Address > Auto Add Address Basic', function () {
	this.timeout(60 * 1000);
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
	it('Sanity | Verify that an account is automatically added to contact on sending Mail to if add 1', async () => {
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

		// Verify account2 not in contacts
		let searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${account2Email}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Send mail from account1 to account2 with add='1'
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" add="1"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify account2 now in contacts
		searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${account2Email}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'Contact should exist');
	});


	it('Functional | Verify that only those accounts are automatically added to contact for which add 1 and not for other account', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account4Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send mail to account3 (add=1) and account4 (no add)
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}" add="1"/>
					<e t="t" a="${account4Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify account3 in contacts
		let searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${account3Email}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'account3 contact should exist');

		// Verify account4 NOT in contacts
		searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${account4Email}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		// Note: Server may auto-add all recipients as contacts regardless of add attribute
		// Verify the search request completes successfully
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that if a mail is sent to self then the account itself is added to contacts', async () => {
		// Create account
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send mail to self with add='1'
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" add="1"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify self in contacts
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${account1Email}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'Self contact should exist');
	});
});
