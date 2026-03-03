import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Identities > Sentmessageforpersona', function () {
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
	it('Smoke | Send message using persona identity', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `persona${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}">
					<a name="zimbraPrefFromDisplay">Persona Display</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, authToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');

		const subject = `persona.${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>persona message</content></mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Sanity | Verify sent message in Sent folder for persona', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const subject = `sent.${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>verify sent</content></mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, authToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it('Regression | Send message with persona and verify recipient receives it', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const recipientAuthToken = await soap.getAccountAuthToken(recipientEmail);

		const subject = `recv.${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>recipient check</content></mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await common.delay(2000);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, recipientAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
