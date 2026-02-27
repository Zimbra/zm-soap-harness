import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Fmt > Sync Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email;
	let messageId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Send a message
		const subject = 'subject' + common.getUniqueString();
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const m = sendRes.SendMsgResponse?.m;
		messageId = (Array.isArray(m) ? m[0] : m).id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Basic verification of Rest Servlet - ask for fmt sync', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Flags', 'Response should contain X-Zimbra-Flags header');
		assert.include(res.body, 'X-Zimbra-Conv', 'Response should contain X-Zimbra-Conv header');
		assert.include(res.body, 'X-Zimbra-Received', 'Response should contain X-Zimbra-Received header');
		assert.include(res.body, 'X-Zimbra-Modified', 'Response should contain X-Zimbra-Modified header');
	});
});
