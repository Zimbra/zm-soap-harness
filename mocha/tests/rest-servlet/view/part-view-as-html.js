import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > View > Part View As HTML', function () {
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

		// Add message with HTML and plain text parts
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: viewAsHtmlTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="altBound"\r\n\r\n--altBound\r\nContent-Type: text/plain\r\n\r\nPlain text content\r\n--altBound\r\nContent-Type: text/html\r\n\r\n<html><body><b>HTML content</b></body></html>\r\n--altBound--\r\n</content>
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
	it('Sanity | View a message part as HTML via REST servlet', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			view: 'html'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, '<', 'HTML response should contain markup');
	});


	it('Sanity | View a message part as HTML with part param via REST servlet', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			extraParams: { part: '2' },
			view: 'html'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'HTML content', 'Response should contain HTML content');
	});


	it('Functional | View plain text part as HTML conversion', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			extraParams: { part: '1' },
			view: 'html'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'Plain text content',
			'HTML-converted plain text should contain original content');
	});
});

