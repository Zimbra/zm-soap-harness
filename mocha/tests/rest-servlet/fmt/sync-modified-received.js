import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Fmt > Sync > Modified and Received', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email;
	let messageId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1Token = await soap.getAccountAuthToken(account1Email);

		// Send a message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>modifiedReceivedTest${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		messageId = sendRes.SendMsgResponse?.m?.id
			|| (Array.isArray(sendRes.SendMsgResponse?.m)
				? sendRes.SendMsgResponse.m[0].id : undefined);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify X-Zimbra-Modified header exists in sync format', async () => {
		if (!messageId) return;
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Modified',
			'Should contain X-Zimbra-Modified header');
	});


	it('Sanity | Verify X-Zimbra-Received header exists in sync format', async () => {
		if (!messageId) return;
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Received',
			'Should contain X-Zimbra-Received header');
	});
});
