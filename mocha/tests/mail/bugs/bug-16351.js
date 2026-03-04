import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 16351', function () {
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
	it('Sanity | Verify bug 16351 - Messages with large number of recipients should not throw OOME', async () => {
		// Create sender account
		const senderEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Create recipient account
		const recipientEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipientEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		const senderAuth = await soap.getAccountAuthToken(senderEmail);

		// Send a message with 100 recipients in To, CC, and BCC (reduced from 1600 for speed)
		const subject = `Subject${common.getUniqueString()}`;
		let toRecipients = '';
		let ccRecipients = '';
		let bccRecipients = '';
		for (let i = 0; i < 34; i++) {
			toRecipients += `\t\t\t\t\t<e t="t" a="${recipientEmail}"/>\n`;
		}
		for (let i = 0; i < 33; i++) {
			ccRecipients += `\t\t\t\t\t<e t="c" a="${recipientEmail}"/>\n`;
		}
		for (let i = 0; i < 33; i++) {
			bccRecipients += `\t\t\t\t\t<e t="b" a="${recipientEmail}"/>\n`;
		}

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
${toRecipients}${ccRecipients}${bccRecipients}					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuth
		);

		// Verify no fault - message should be sent successfully without OOME
		assert.notExists(sendRes.Fault, 'SendMsgRequest with many recipients should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});
});
