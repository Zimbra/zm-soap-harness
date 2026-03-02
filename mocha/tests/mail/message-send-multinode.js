import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Send Multinode', function () {
	this.timeout(60 * 1000);
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

	/**
	 * Helper: send message and verify recipient receives it
	 * Uses retry logic to wait for message delivery
	 */
	async function sendAndVerify(senderEmail, recipientEmail) {
		const senderAuthToken = await soap.getAccountAuthToken(senderEmail);
		const recipientAuthToken = await soap.getAccountAuthToken(recipientEmail);
		const subject = `MultiHost testing subject line`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${recipientEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>MultiHost testing in contents</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Wait briefly for delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search for the message with retry
		let found = false;
		for (let retry = 0; retry < 5; retry++) {
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>from:${senderEmail} in:inbox</query>
				</SearchRequest>`, recipientAuthToken
			);
			if (!searchRes.Fault && searchRes.SearchResponse && searchRes.SearchResponse.m) {
				const msgs = Array.isArray(searchRes.SearchResponse.m)
					? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
				if (msgs[0] && msgs[0].su) {
					assert.include(msgs[0].su, 'MultiHost testing subject line', 'Subject should match');
					found = true;
					break;
				}
			}
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		assert.isTrue(found, 'Message should be found in recipient inbox');
	}

	// Tests
	it('Smoke | Send Mail from A1 to A2 verify A2 receives the message successfully', async () => {
		// Create test accounts
		const accountA1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		const accountA2Email = `multihost${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send from A1 to A2 and verify
		await sendAndVerify(accountA1Email, accountA2Email);
	});


	it('Sanity | Send Mail from A1 to B1 verify B1 receives the message successfully', async () => {
		// Create test accounts
		const accountA1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		const accountB1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send from A1 to B1 and verify
		await sendAndVerify(accountA1Email, accountB1Email);
	});


	it('Sanity | Send Mail from B1 to B2 verify B2 receives the message successfully', async () => {
		// Create test accounts
		const accountB1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		const accountB2Email = `multihost${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send from B1 to B2 and verify
		await sendAndVerify(accountB1Email, accountB2Email);
	});


	it('Sanity | Send Mail from B1 to A1 verify A1 receives the message successfully', async () => {
		// Create test accounts
		const accountB1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		const accountA1Email = `multihost${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountB1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountA1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send from B1 to A1 and verify
		await sendAndVerify(accountB1Email, accountA1Email);
	});
});
