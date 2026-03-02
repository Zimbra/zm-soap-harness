import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 31552', function () {
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
	it('Sanity | Attachment file names are always encoded in UTF-8', async () => {
		// Create the account with zimbraPrefMailDefaultCharset set to iso-2022-jp
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailDefaultCharset">iso-2022-jp</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with attachment via AddMsgRequest
		const subject = `subject${common.getUniqueString()}`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"
--boundary123
Content-Type: text/plain; charset="iso-2022-jp"
Content-Transfer-Encoding: 7bit
Hello
--boundary123
Content-Type: application/octet-stream; name="test-file.txt"
Content-Disposition: attachment; filename="test-file.txt"
Content-Transfer-Encoding: base64
dGVzdCBjb250ZW50
--boundary123--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Get the message to verify message parts
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');

		// Verify the multipart/mixed structure exists
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.mp, 'Message should have mime parts');
	});
});
