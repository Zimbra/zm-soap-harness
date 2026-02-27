import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Mail > Part Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let messageId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Add a message with attachment
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: partBasicTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="boundary2"\r\n\r\n--boundary2\r\nContent-Type: text/plain\r\n\r\nPart basic test body\r\n--boundary2\r\nContent-Type: text/plain; name="test.txt"\r\nContent-Disposition: attachment; filename="test.txt"\r\n\r\nattachment content\r\n--boundary2--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const m = addRes.AddMsgResponse?.m;
		messageId = (Array.isArray(m) ? m[0] : m).id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Get a message part using the REST servlet', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			extraParams: { part: '2' }
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'attachment content', 'Response should contain attachment content');
	});


	it('Functional | Get first part (text body) of a multipart message', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			extraParams: { part: '1' }
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'Part basic test body', 'Response should contain text body');
	});


	it('Functional | Get message in sync format to verify part structure', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'boundary', 'Sync format should show MIME boundary');
	});
});

