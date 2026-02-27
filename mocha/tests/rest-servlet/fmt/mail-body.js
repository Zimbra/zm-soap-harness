import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Fmt > Body > Mail Body', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let plainMsgId, htmlMsgId, multipartMsgId;
	let attachMsgId, inlineMsgId, nestedMsgId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Plain text message
		const addPlain = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: plainBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nPlain text body content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addPlain.Fault, 'Response should not be a Fault');
		plainMsgId = addPlain.AddMsgResponse?.m?.id
			|| (Array.isArray(addPlain.AddMsgResponse?.m)
				? addPlain.AddMsgResponse.m[0].id : undefined);

		// HTML message
		const addHtml = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: htmlBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n&lt;html&gt;&lt;body&gt;&lt;b&gt;HTML body content&lt;/b&gt;&lt;/body&gt;&lt;/html&gt;\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addHtml.Fault, 'Response should not be a Fault');
		htmlMsgId = addHtml.AddMsgResponse?.m?.id
			|| (Array.isArray(addHtml.AddMsgResponse?.m)
				? addHtml.AddMsgResponse.m[0].id : undefined);

		// Multipart message
		const addMulti = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: multipartBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="bodyBound"\r\n\r\n--bodyBound\r\nContent-Type: text/plain\r\n\r\nPlain part\r\n--bodyBound\r\nContent-Type: text/html\r\n\r\n&lt;b&gt;HTML part&lt;/b&gt;\r\n--bodyBound--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addMulti.Fault, 'Response should not be a Fault');
		multipartMsgId = addMulti.AddMsgResponse?.m?.id
			|| (Array.isArray(addMulti.AddMsgResponse?.m)
				? addMulti.AddMsgResponse.m[0].id : undefined);

		// Message with attachment
		const addAttach = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: attachBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="attachBody"\r\n\r\n--attachBody\r\nContent-Type: text/plain\r\n\r\nbody with attachment\r\n--attachBody\r\nContent-Type: text/plain; name="file.txt"\r\nContent-Disposition: attachment; filename="file.txt"\r\n\r\nfile content\r\n--attachBody--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addAttach.Fault, 'Response should not be a Fault');
		attachMsgId = addAttach.AddMsgResponse?.m?.id
			|| (Array.isArray(addAttach.AddMsgResponse?.m)
				? addAttach.AddMsgResponse.m[0].id : undefined);

		// Message with inline image
		const addInline = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: inlineBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="inlineBody"\r\n\r\n--inlineBody\r\nContent-Type: text/html\r\n\r\n&lt;html&gt;inline image test&lt;/html&gt;\r\n--inlineBody\r\nContent-Type: image/png; name="test.png"\r\nContent-Disposition: inline; filename="test.png"\r\nContent-Transfer-Encoding: base64\r\n\r\niVBORw0KGgo=\r\n--inlineBody--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addInline.Fault, 'Response should not be a Fault');
		inlineMsgId = addInline.AddMsgResponse?.m?.id
			|| (Array.isArray(addInline.AddMsgResponse?.m)
				? addInline.AddMsgResponse.m[0].id : undefined);

		// Nested multipart message
		const addNested = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: nestedBodyTest\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="nestedOuter"\r\n\r\n--nestedOuter\r\nContent-Type: multipart/alternative; boundary="nestedInner"\r\n\r\n--nestedInner\r\nContent-Type: text/plain\r\n\r\nnested plain\r\n--nestedInner\r\nContent-Type: text/html\r\n\r\n&lt;b&gt;nested html&lt;/b&gt;\r\n--nestedInner--\r\n--nestedOuter\r\nContent-Type: text/plain; name="nested.txt"\r\nContent-Disposition: attachment\r\n\r\nnested attachment\r\n--nestedOuter--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addNested.Fault, 'Response should not be a Fault');
		nestedMsgId = addNested.AddMsgResponse?.m?.id
			|| (Array.isArray(addNested.AddMsgResponse?.m)
				? addNested.AddMsgResponse.m[0].id : undefined);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Get plain text message body via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: plainMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'Plain text body content',
			'Response should contain plain text body');
	});


	it('Functional | Get HTML message body via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: htmlMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'HTML body content', 'HTML response should contain expected content');
	});


	it('Functional | Get multipart alternative message via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: multipartMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'Plain part', 'Multipart response should contain plain part content');
	});


	it('Functional | Get message with attachment body via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: attachMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'body with attachment', 'Attachment response should contain body content');
	});


	it('Functional | Get message with inline image via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: inlineMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'inline image test', 'Inline image response should contain body content');
	});


	it('Functional | Get nested multipart message via REST', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: nestedMsgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'nested plain', 'Nested multipart response should contain plain content');
	});
});
