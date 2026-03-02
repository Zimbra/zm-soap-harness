import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Mail > Message Send', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token;
	let account3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Token = await soap.getAccountAuthToken(account2Email);

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Smoke | Send message and verify contact auto-added', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Sanity | Send message to contact and verify', async () => {
		const contactEmail = `email${common.getUniqueString()}@domain.com`;

		// Create a contact
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contactEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Send message to multiple contacts', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="c" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content to multiple recipients</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Send and verify sent message in sent folder', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>verify sent folder content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Reply to message from contact', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>reply test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>reply test message</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Forward message to contact', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Fwd: forward test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>forwarded message</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Forward should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});
});
