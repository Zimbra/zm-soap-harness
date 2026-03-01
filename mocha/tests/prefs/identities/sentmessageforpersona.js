import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('SentMessageForPersona', function () {
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

	it('Smoke | Send message using persona identity', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const idName = `persona${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${idName}">
					<a name="zimbraPrefFromDisplay">Persona Display</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, authToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');

		const subject = `persona.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>persona message</content></mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});

	it('Sanity | Verify sent message in Sent folder for persona', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const subject = `sent.${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>verify sent</content></mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});

	it('Regression | Send message with persona and verify recipient receives it', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const recipientEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const recipientAuthToken = await soap.getAccountAuthToken(recipientEmail);

		const subject = `recv.${common.getUniqueString()}`;
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
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, recipientAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
