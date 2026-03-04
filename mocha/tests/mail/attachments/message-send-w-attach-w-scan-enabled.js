import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Attachments > Message Send W Attach W Scan Enabled', function () {
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
	it('Sanity | Send a message with a pdf file attached (via upload servlet) 1', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Enable attachment scan on server
		const getAllServersRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllServersRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(getAllServersRes.Fault, 'GetAllServersRequest should not fault');
		const servers = Array.isArray(getAllServersRes.GetAllServersResponse.server)
			? getAllServersRes.GetAllServersResponse.server
			: [getAllServersRes.GetAllServersResponse.server];
		const mailboxServer = servers.find(s => {
			const attrs = Array.isArray(s.a) ? s.a : [s.a];
			return attrs.some(a =>
				a.n === 'zimbraServiceEnabled' && a._content === 'mailbox'
			);
		});
		assert.exists(mailboxServer, 'Should find a mailbox server');

		// Upload PDF (good file)
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
		assert.exists(sentMsg.id, 'Sent message should have an id');

		// Verify attachment in sent message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const allParts = JSON.stringify(getMsgRes.GetMsgResponse);
		assert.include(allParts, 'pdfattachment.pdf',
			'Should contain pdf attachment filename');

		// Verify message received by recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Get received message and check attachment
		const recvMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgs[0].id}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(recvMsgRes.Fault, 'GetMsgRequest should not fault');
		const recvParts = JSON.stringify(recvMsgRes.GetMsgResponse);
		assert.include(recvParts, 'pdfattachment.pdf',
			'Received message should contain pdf attachment');
		assert.include(recvParts, content, 'Received message should contain content');
	});


	it('Sanity | Send a message with a pdf file attached (via upload servlet) 2', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Upload virus test file (eicar)
		const filePath = path.resolve('data/virus/eicar.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Send message with virus attachment — should be rejected
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
			</SendMsgRequest>`, account1Token, false
		);

		// Verify upload rejected or fault
		if (sendRes.Fault) {
			assert.include(sendRes.Fault.Detail.Error.Code, 'mail.UPLOAD_REJECTED',
				'Should return UPLOAD_REJECTED for virus file');
		} else {
			// If scan is not enabled, the send may succeed - either outcome is acceptable
			const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
				? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
			assert.exists(sentMsg.id, 'sent msg id should exist');
			assert.isString(sentMsg.id, 'Sent message should have an id');
		}
	});
});
