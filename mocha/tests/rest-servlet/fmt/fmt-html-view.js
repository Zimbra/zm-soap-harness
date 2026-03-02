import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Fmt > Fmt HTML View', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let messageId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Add message with multiple MIME parts
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: fmtHtmlTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="fmtHtmlBound"\r\n\r\n--fmtHtmlBound\r\nContent-Type: text/plain\r\n\r\nFmt HTML plain content\r\n--fmtHtmlBound\r\nContent-Type: text/html\r\n\r\n<html><body><b>Fmt HTML content</b></body></html>\r\n--fmtHtmlBound--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const m = addRes.AddMsgResponse?.m;
		messageId = (Array.isArray(m) ? m[0] : m).id;
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
	it('Functional | View message part as HTML via fmt parameter', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'html'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'HTML', 'HTML response should contain HTML markup');
	});
});
