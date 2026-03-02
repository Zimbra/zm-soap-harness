import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Attachments > MIME Types', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Smoke | Send a message with a simple text attachment', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload text file
		const filePath = path.resolve('data/attachments1/filename.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message and verify attachment content type
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const parts = Array.isArray(msg.mp) ? msg.mp : [msg.mp];
		const allParts = JSON.stringify(parts);
		assert.include(allParts, 'text/plain', 'Attachment should have text/plain content type');
	});


	it('Sanity | Send a message with an XLS attachment', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload XLS file
		const filePath = path.resolve('data/attachments1/book1.xls');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message and verify attachment content type
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const allParts = JSON.stringify(msg.mp);
		assert.include(allParts, 'application/vnd.ms-excel',
			'Attachment should have application/vnd.ms-excel content type');
	});


	it('Sanity | Send a message with an XLS attachment (with incorrect upload attachment type)', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload XLS file
		const filePath = path.resolve('data/attachments1/book1.xls');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/html">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message and verify attachment content type is still correct
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const allParts = JSON.stringify(msg.mp);
		assert.include(allParts, 'application/vnd.ms-excel',
			'Attachment should have application/vnd.ms-excel content type');
	});


	it('Sanity | Send a message with an doc attachment (with incorrect upload attachment type)', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload DOC file
		const filePath = path.resolve('data/attachments1/word.doc');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message and verify attachment content type
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const allParts = JSON.stringify(msg.mp);
		assert.include(allParts, 'application/msword',
			'Attachment should have application/msword content type');
	});


	it('Sanity | Send a message with an pdf attachment (with incorrect upload attachment type)', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload PDF file
		const filePath = path.resolve('data/attachments1/pdfaccess.pdf');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with attachment
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message and verify attachment content type
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const allParts = JSON.stringify(msg.mp);
		assert.include(allParts, 'application/pdf',
			'Attachment should have application/pdf content type');
	});
});
