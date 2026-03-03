import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Mail > Attachments > Message Send W Attach', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let account1Email;
	let account2Email;
	let account1Token;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create accounts
		account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Send a message with a simple attachment', async () => {
		// Upload text attachment
		const filePath = path.resolve('data/email27/textattachment.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Sanity | Send a message with a bmp attachment that was uploaded using the upload servlet', async () => {
		// Upload BMP attachment
		const filePath = path.resolve('data/email27/bitmapattachment.bmp');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'Sent message should have an id');

		// Verify message via GetMsgRequest
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(String(msg.id), String(sentMsg.id), 'Message id should match');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Send a message with a doc file attached via upload servlet', async () => {
		// Upload DOC file
		const filePath = path.resolve('data/blockextension/email-doc.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Send a message with a txt file attached (via upload servlet)', async () => {
		// Upload TXT file
		const filePath = path.resolve('data/blockextension/email-txt.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Send a message with a pdf file attached (via upload servlet)', async () => {
		// Upload PDF file
		const filePath = path.resolve('data/email27/pdfattachment.pdf');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Send a message with a tar file attached (via upload servlet)', async () => {
		// Upload TAR file
		const filePath = path.resolve('data/blockextension/email-tar.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Send a message with a java file attached (via upload servlet)', async () => {
		// Upload JAVA file
		const filePath = path.resolve('data/blockextension/email-java.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

		// Verify via REST servlet
		const restRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: sentMsg.id
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Functional | Send a message with a Microsoft MapPoint file attached (via upload servlet)', async () => {
		// Upload MapPoint file
		const filePath = path.resolve('data/email27/pdfattachment.pdf');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Verify via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Functional | Send mail by specifying relative path in attachment', async () => {
		// Get briefcase folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = folders.find(f => f.name === 'Briefcase');
		assert.exists(briefcase, 'Briefcase folder should exist');

		// Upload file to briefcase
		const filePath = path.resolve('data/attachments1/filename.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Save document to briefcase
		const saveDocRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase.id}">
					<upload id="${aid}"/>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveDocRes.Fault, 'SaveDocumentRequest should not fault');

		// Send message with optional doc path attachment
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach>
						<doc path="Briefcase/basic1.html" optional="1"/>
					</attach>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});
});
