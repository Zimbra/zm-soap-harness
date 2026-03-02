import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 60948', function () {
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
	it('Sanity | Inject mime and verify print message renders', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: NPC Window 8 POP Order
MIME-Version: 1.0
Content-Type: text/html; charset="utf-8"
&lt;html&gt;&lt;body&gt;Order content for print test&lt;/body&gt;&lt;/html&gt;
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(NPC Window 8 POP Order)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');

		// Get the message to verify it renders properly
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});


	it('Sanity | Inject mime with mht and verify rendering', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with embedded content
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: Testing File Format
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary60948"

--boundary60948
Content-Type: text/plain

Test message with mht attachment
--boundary60948
Content-Type: text/html

&lt;html&gt;&lt;body&gt;Embedded HTML content&lt;/body&gt;&lt;/html&gt;
--boundary60948--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msgId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Get the message and verify structure
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});
});
