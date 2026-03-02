import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 54590', function () {
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
	it('Sanity | Mime parser - Attachment with japanese name cannot be searched with filename - search', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with a Japanese filename attachment
		const japaneseFilename = '日本語.txt';
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: Japanese attachment test
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary54590"
--boundary54590
Content-Type: text/plain; charset="utf-8"
Test message with Japanese filename attachment
--boundary54590
Content-Type: text/plain; charset="utf-8"; name="=?UTF-8?B?5pel5pys6Kqe?=.txt"
Content-Disposition: attachment; filename="=?UTF-8?B?5pel5pys6Kqe?=.txt"
Content-Transfer-Encoding: base64
44OG44K544OI
--boundary54590--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Search for the message by Japanese filename
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>filename:(${japaneseFilename})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find message with Japanese filename attachment');
	});
});
