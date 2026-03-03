import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 56203', function () {
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
	it('Sanity | Verify bug 56203 - double-quotes and open-parens break encoded-words', async () => {
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

		// Add a message with Chinese subject and XLS attachment
		const chineseSubject = '最新版支出金额权限表';
		const attachmentFilename = 'SCH支出金额权限表-20101001.xls';
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${account1Email}
Subject: =?UTF-8?B?5pyA5paw54mI5pSv5Ye66YeR6aKd5p2D6ZmQ6KGo?=
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary56203"
--boundary56203
Content-Type: text/plain; charset="utf-8"
Test message
--boundary56203
Content-Type: application/vnd.ms-excel; name="=?UTF-8?B?U0NI5pSv5Ye66YeR6aKd5p2D6ZmQ6KGoLTIwMTAxMDAxLnhscw==?="
Content-Disposition: attachment; filename="=?UTF-8?B?U0NI5pSv5Ye66YeR6aKd5p2D6ZmQ6KGoLTIwMTAxMDAxLnhscw==?="
Content-Transfer-Encoding: base64
dGVzdA==
--boundary56203--
</content>
				</m>
			</AddMsgRequest>`, authToken1
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Search for the message

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${chineseSubject}</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');

		// Get the message and verify attachment filename
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken1
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify the attachment filename contains Chinese characters
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const findAttachment = (mp) => {
			if (!mp) return null;
			const parts = Array.isArray(mp) ? mp : [mp];
			for (const p of parts) {
				if (p.filename && p.filename.includes('SCH')) return p;
				if (p.mp) {
					const found = findAttachment(p.mp);
					if (found) return found;
				}
			}
			return null;
		};
		const attachment = findAttachment(msg.mp);
		assert.exists(attachment, 'Should find attachment with Chinese filename');

		// Forward the message to account2
		const authToken2 = await soap.getAccountAuthToken(account2Email);
		const partId = attachment.part;
		const fwdRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: ${chineseSubject}</su>
					<mp ct="text/plain">
						<content>----- Forwarded Message -----</content>
					</mp>
					<attach>
						<mp mid="${msgId}" part="${partId}"/>
					</attach>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(fwdRes.Fault, 'SendMsgRequest forward should not fault');
		const sentMsg = Array.isArray(fwdRes.SendMsgResponse.m)
			? fwdRes.SendMsgResponse.m[0] : fwdRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify the forwarded message is received by account2

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${chineseSubject}</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes2.SearchResponse.m, 'Account2 should receive forwarded message');
	});
});
