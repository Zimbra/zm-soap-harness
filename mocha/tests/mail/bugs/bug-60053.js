import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 60053', function () {
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
	it('Sanity | Send multiple pictures as attachment and verify the attachment', async () => {
		// Create two accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
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
		const authToken1 = await soap.getAccountAuthToken(account1Email);

		// Send a message with two image attachments
		const subject = 'Send with attachment';
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain">
							<content>Message with attachments</content>
						</mp>
						<mp ct="image/jpeg" filename="sunset.jpg">
							<content>/9j/4AAQ</content>
						</mp>
						<mp ct="image/jpeg" filename="img-7120.jpg">
							<content>/9j/4AAQ</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const sentMsgId = (Array.isArray(sendRes.SendMsgResponse.m) ? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m).id;

		// Get the sent message and verify
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}" read="1"/>
			</GetMsgRequest>`, authToken1
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse.m, 'Message should exist');
	});
});
