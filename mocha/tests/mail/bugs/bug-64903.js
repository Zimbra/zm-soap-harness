import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 64903', function () {
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
	it('Sanity | Verify pnsrc attribute return in GetMsgResponse', async () => {
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

		// Disable display external images for account1
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDisplayExternalImages">FALSE</pref>
			</ModifyPrefsRequest>`, authToken1
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Add an HTML email with an image to account2
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${account2Email}
Subject: Christian cartoons [SEC=UNCLASSIFIED]
MIME-Version: 1.0
Content-Type: multipart/related; boundary="boundary64903"
--boundary64903
Content-Type: text/html; charset="utf-8"
&lt;html&gt;&lt;body&gt;&lt;img src="cid:image001.jpg@test"&gt;&lt;/body&gt;&lt;/html&gt;
--boundary64903
Content-Type: image/jpeg
Content-ID: &lt;image001.jpg@test&gt;
Content-Transfer-Encoding: base64
/9j/4AAQSkZJRgABAQ==
--boundary64903--
</content>
				</m>
			</AddMsgRequest>`, authToken1
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Search for the message in the same account where it was added
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Christian cartoons)</query>
			</SearchRequest>`, authToken1
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the message with html=1 to check pnsrc attribute
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" html="1"/>
			</GetMsgRequest>`, authToken1
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});
});
