import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Mail > Blocked Attachments', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Add a message with an attachment
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: blocked attachment test\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="boundary1"\r\n\r\n--boundary1\r\nContent-Type: text/plain\r\n\r\nTest body\r\n--boundary1\r\nContent-Type: application/octet-stream; name="test.exe"\r\nContent-Disposition: attachment; filename="test.exe"\r\nContent-Transfer-Encoding: base64\r\n\r\ndGVzdCBkYXRh\r\n--boundary1--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
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
	it('Sanity | Verify that blocked attachments are handled by REST servlet', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'zip',
			returnBuffer: true
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.isAbove(res.body.length, 10, 'ZIP response should contain message data');
	});


	it('Sanity | Verify that blocked attachments return proper status', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox'
		});

		// Verify response
		assert.oneOf(res.status, [200, 302], 'REST GET should return 200 or redirect');
	});
});
