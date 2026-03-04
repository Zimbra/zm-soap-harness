import path from 'node:path';
import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Drafts > Send From Draft > Send From Draft', function () {
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
	it('Smoke | Send mail from saved draft 1', async () => {
		// Create test accounts
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account2Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Save message to draft
		const subject = `Subject1${common.getUniqueString()}`;
		const content = `boby ${common.getUniqueString()} Send from draft`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject} </su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Send message using send from draft
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="${draft.id}"></m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for message delivery
		let searchRes;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be found');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.include(String(msgs[0].su), subject, 'Subject should match');
	});


	it('Sanity | Send mail from saved draft with attachment', async () => {
		// Create test accounts
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account2Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Upload attachment
		const filePath = path.resolve('data/email01/msg01.txt');
		const attachmentId = await soap.uploadFile(account1AuthToken, filePath);
		assert.exists(attachmentId, 'Upload should return an attachment ID');

		// Save draft with attachment
		const subject = `Subject1${common.getUniqueString()}`;
		const content = `boby ${common.getUniqueString()} Send from draft`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject} </su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${attachmentId}" />
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Send from draft
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="${draft.id}"></m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify account 2 receives the message
		let searchRes;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be found');

		// Verify message content
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgs[0].id}"/>
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Sanity | Send mail from non existing draft id', async () => {
		// Create test account
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send mail from non existing draft id
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="123456"></m>
			</SendMsgRequest>`, account1AuthToken, false
		);

		// Verify it gives error
		assert.isString(sendRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(sendRes.Fault.Detail.Error.Code,
			'mail.NO_SUCH_MSG', 'Error code should be mail.NO_SUCH_MSG');
	});


	it('Sanity | Send mail from saved draft without recipients', async () => {
		// Create test account
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Save message to draft without recipients
		const subject = `Subject1${common.getUniqueString()}`;
		const content = `boby ${common.getUniqueString()} Send from draft`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>${subject} </su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Send from draft without recipients should fail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="${draft.id}"></m>
			</SendMsgRequest>`, account1AuthToken, false
		);

		// Verify send failure
		assert.isString(sendRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(sendRes.Fault.Detail.Error.Code,
			'mail.SEND_FAILURE', 'Error code should be mail.SEND_FAILURE');
	});


	it('Sanity | Send mail from saved draft 2', async () => {
		// Create test accounts
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account2Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account3Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account4Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
		const createAcctRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes4.Fault, 'CreateAccountRequest should not fault');
		const acctInfo4 = Array.isArray(createAcctRes4.CreateAccountResponse.account)
			? createAcctRes4.CreateAccountResponse.account[0]
			: createAcctRes4.CreateAccountResponse.account;
		assert.exists(acctInfo4.id, 'Account ID should exist');
		const host4 = acctInfo4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'zimbraMailHost should exist');
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		// Save draft with to/cc/bcc recipients
		const subject = `Subject1${common.getUniqueString()}`;
		const content = `boby ${common.getUniqueString()} Send from draft`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="c" a="${account3Email}"/>
					<e t="b" a="${account4Email}"/>
					<su>${subject} </su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Send from draft
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="${draft.id}">
					<e t="t" a="${account2Email}"/>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for message delivery and verify account 2 receives the message (To)
		let searchRes2;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes2 = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
		assert.notExists(searchRes2.Fault, 'SearchRequest for account2 should not fault');
		assert.exists(searchRes2.SearchResponse.m, 'Account2 should find the message');
		const msgs2 = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m : [searchRes2.SearchResponse.m];
		assert.include(String(msgs2[0].su), subject, 'Account2 subject should match');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Verify account 3 receives the message (CC)
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(searchRes3.Fault, 'SearchRequest for account3 should not fault');
		assert.exists(searchRes3.SearchResponse.m, 'Account3 should find the message');
		const msgs3 = Array.isArray(searchRes3.SearchResponse.m)
			? searchRes3.SearchResponse.m : [searchRes3.SearchResponse.m];
		assert.include(String(msgs3[0].su), subject, 'Account3 (CC) subject should match');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Verify account 4 receives the message (BCC)
		const searchRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
		);
		assert.notExists(searchRes4.Fault, 'SearchRequest for account4 should not fault');
		assert.exists(searchRes4.SearchResponse.m, 'Account4 should find the message');
		const msgs4 = Array.isArray(searchRes4.SearchResponse.m)
			? searchRes4.SearchResponse.m : [searchRes4.SearchResponse.m];
		assert.include(String(msgs4[0].su), subject, 'Account4 (BCC) subject should match');
	});


	it('Sanity | Send mail from saved draft as reply of a conversation', async () => {
		// Create test accounts
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account2Email = `testDraft${common.getUniqueString()}@${testDomain}`;
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
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Account 1 sends an email to account 2
		const subject = `Subject2${common.getUniqueString()}`;
		const content = `content of the second message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Account 2 forwards back to account 1
		const msg1 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		const fwdRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msg1.id}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su> Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content> Forwarded content : ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(fwdRes.Fault, 'Forward SendMsgRequest should not fault');
		const fwdMsg = Array.isArray(fwdRes.SendMsgResponse.m)
			? fwdRes.SendMsgResponse.m[0] : fwdRes.SendMsgResponse.m;

		// Account 1 gets the conversation id

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchConvRes.Fault, 'SearchRequest should not fault');

		// Save draft reply with original id
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${fwdMsg.id}" rt="r">
					<e t="t" a="${account2Email}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content>Send From draft Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Send mail to account2 using draft id
		const sendFromDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m sfd="1" did="${draft.id}"></m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendFromDraftRes.Fault, 'SendMsgRequest from draft should not fault');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Verify account 2 receives the reply
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Conversation should be found');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(convs[0], 'At least one conversation should exist');
	});
});
