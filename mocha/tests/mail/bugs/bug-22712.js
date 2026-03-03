import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 22712', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Send a mail to a address with trailing', async () => {
		// Create sender account
		const senderEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const senderAuth = await soap.getAccountAuthToken(senderEmail);

		// Create recipient account with trailing dot in name
		const recipientEmail = `test${common.getUniqueString()}.@${testDomain}`;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create recipient account with double trailing dots
		const recipientEmail2 = `test${common.getUniqueString()}..@${testDomain}`;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send a message to both trailing dot addresses
		const subject = `Subject of the message is testing`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<e t="t" a="${recipientEmail2}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify recipient with trailing dot received the message
		if (createRes2 && !createRes2.Fault) {
			const recipAuth = await soap.getAccountAuthToken(recipientEmail);

		await new Promise(resolve => setTimeout(resolve, 2000));
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, recipAuth
			);
			assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
			assert.exists(searchRes.SearchResponse.m, 'Message should be found in recipient mailbox');
		}

		// Verify recipient with double trailing dots received the message
		if (createRes3 && !createRes3.Fault) {
			const recipAuth2 = await soap.getAccountAuthToken(recipientEmail2);

		await new Promise(resolve => setTimeout(resolve, 2000));
			const searchRes2 = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, recipAuth2
			);
			assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
			assert.exists(searchRes2.SearchResponse.m, 'Message should be found in recipient2 mailbox');
		}
	});
});
