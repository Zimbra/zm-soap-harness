import path from 'node:path';
import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Get', function () {
	this.timeout(60 * 1000);
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

	/**
	 * Helper: Create test account and return auth token and email
	 */
	async function setupAccount() {
		const accountEmail = 'test' + common.getUniqueString() + '@' + testDomain;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			'<CreateAccountRequest xmlns="urn:zimbraAdmin">' +
			'<name>' + accountEmail + '</name>' +
			'<password>' + config.accountPassword + '</password>' +
			'</CreateAccountRequest>', adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const authToken = await soap.getAccountAuthToken(accountEmail);
		return { accountEmail, authToken };
	}

	/**
	 * Helper: Send message and return message id
	 */
	async function sendMessage(accountEmail, authToken, subject, content) {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			'<SendMsgRequest xmlns="urn:zimbraMail">' +
			'<m>' +
			'<e t="t" a="' + accountEmail + '"/>' +
			'<su>' + subject + '</su>' +
			'<mp ct="text/plain">' +
			'<content>' + content + '</content>' +
			'</mp>' +
			'</m>' +
			'</SendMsgRequest>', authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const m = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		return m.id;
	}

	/**
	 * Helper: Add message via AddMsgRequest and return message id
	 */
	async function addMessage(authToken, folderId, mimeContent) {
		const addRes = await soap.makeSOAPEnvelopeAccount(
			'<AddMsgRequest xmlns="urn:zimbraMail">' +
			'<m l="' + folderId + '">' +
			'<content>' + mimeContent + '</content>' +
			'</m>' +
			'</AddMsgRequest>', authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const m = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		return m.id;
	}

	// Tests
	it('Sanity | To get a mail with valid message id', async () => {
		// Create account
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const content = 'content' + common.getUniqueString();

		// Send a message
		const messageId = await sendMessage(accountEmail, authToken, subject, content);

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="1" html="1"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, messageId, 'Message id should match');
	});


	it('Regression | Get message with valid message id with leading spaces', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Get message with leading spaces in id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="        ' + messageId + '" read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with valid message id with trailing spaces', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Get message with trailing spaces in id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '        " read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with valid message id with leading and trailing spaces', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Get message with leading and trailing spaces in id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="       ' + messageId + '        " read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with blank message id', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Get message with blank id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="" read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with all spaces in message id', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Get message with all spaces in id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="           " read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with special character in message id', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Get message with special chars in id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="//\\\\\'^\%" read="1" html="1"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Functional | Get message with valid message id and read attribute and html attribute 0', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Get message with read=0 and html=0
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="0"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, messageId, 'Message id should match');
	});


	it('Regression | GetMsgRequest without specifying id', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Get message without specifying id
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m read="1" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should be service.INVALID_REQUEST');
	});


	it('Regression | Get message with non existing message id', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Delete the message
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="delete"/>' +
			'</MsgActionRequest>', authToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(deleteRes.MsgActionResponse.action.op, 'delete', 'op should be delete');
		assert.equal(deleteRes.MsgActionResponse.action.id, messageId, 'id should match');

		// Get the deleted message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="1" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);

		// Verify fault
		assert.isString(getMsgRes.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(getMsgRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_MSG', 'Should be mail.NO_SUCH_MSG');
	});


	it('Regression | Get message with valid id and invalid read attribute (alpha, number, spchar, negative, blank)', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Test with sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="some text" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res1.Fault, 'GetMsgRequest with sometext read should not fault');
		const msg1 = Array.isArray(res1.GetMsgResponse.m)
			? res1.GetMsgResponse.m[0] : res1.GetMsgResponse.m;
		assert.exists(msg1.id, 'Message id should exist for sometext read');

		// Test with number
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="123" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res2.Fault, 'GetMsgRequest with number read should not fault');
		const msg2 = Array.isArray(res2.GetMsgResponse.m)
			? res2.GetMsgResponse.m[0] : res2.GetMsgResponse.m;
		assert.exists(msg2.id, 'Message id should exist for number read');

		// Test with spchar
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="//\\\\\'^\%" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res3.Fault, 'GetMsgRequest with spchar read should not fault');
		const msg3 = Array.isArray(res3.GetMsgResponse.m)
			? res3.GetMsgResponse.m[0] : res3.GetMsgResponse.m;
		assert.exists(msg3.id, 'Message id should exist for spchar read');

		// Test with negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="-2" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res4.Fault, 'GetMsgRequest with negative read should not fault');
		const msg4 = Array.isArray(res4.GetMsgResponse.m)
			? res4.GetMsgResponse.m[0] : res4.GetMsgResponse.m;
		assert.exists(msg4.id, 'Message id should exist for negative read');

		// Test with blank
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="" html="0"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res5.Fault, 'GetMsgRequest with blank read should not fault');
		const msg5 = Array.isArray(res5.GetMsgResponse.m)
			? res5.GetMsgResponse.m[0] : res5.GetMsgResponse.m;
		assert.exists(msg5.id, 'Message id should exist for blank read');
	});


	it('Regression | Get message with valid id and invalid html attribute (alpha, number, spchar, negative, blank)', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Test with sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="some text"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res1.Fault, 'GetMsgRequest with sometext html should not fault');
		const htmlMsg1 = Array.isArray(res1.GetMsgResponse.m)
			? res1.GetMsgResponse.m[0] : res1.GetMsgResponse.m;
		assert.exists(htmlMsg1.id, 'Message id should exist for sometext html');

		// Test with number
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="123"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res2.Fault, 'GetMsgRequest with number html should not fault');
		const htmlMsg2 = Array.isArray(res2.GetMsgResponse.m)
			? res2.GetMsgResponse.m[0] : res2.GetMsgResponse.m;
		assert.exists(htmlMsg2.id, 'Message id should exist for number html');

		// Test with spchar
		const res3 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="//\\\\\'^\%"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res3.Fault, 'GetMsgRequest with spchar html should not fault');
		const htmlMsg3 = Array.isArray(res3.GetMsgResponse.m)
			? res3.GetMsgResponse.m[0] : res3.GetMsgResponse.m;
		assert.exists(htmlMsg3.id, 'Message id should exist for spchar html');

		// Test with negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="-2"/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res4.Fault, 'GetMsgRequest with negative html should not fault');
		const htmlMsg4 = Array.isArray(res4.GetMsgResponse.m)
			? res4.GetMsgResponse.m[0] : res4.GetMsgResponse.m;
		assert.exists(htmlMsg4.id, 'Message id should exist for negative html');

		// Test with blank
		const res5 = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html=""/>' +
			'</GetMsgRequest>', authToken, false
		);
		assert.notExists(res5.Fault, 'GetMsgRequest with blank html should not fault');
		const htmlMsg5 = Array.isArray(res5.GetMsgResponse.m)
			? res5.GetMsgResponse.m[0] : res5.GetMsgResponse.m;
		assert.exists(htmlMsg5.id, 'Message id should exist for blank html');
	});


	it('Functional | GetMsgRequest for message which is tagged', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Create a tag
		const tagName = 'tag' + common.getUniqueString();
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			'<CreateTagRequest xmlns="urn:zimbraMail">' +
			'<tag name="' + tagName + '" color="2"/>' +
			'</CreateTagRequest>', authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tag = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tag.id;

		// Tag the message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="tag" tag="' + tagId + '"/>' +
			'</MsgActionRequest>', authToken
		);
		assert.notExists(tagRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(tagRes.MsgActionResponse.action.op, 'tag', 'op should be tag');
		assert.equal(tagRes.MsgActionResponse.action.id, messageId, 'id should match');

		// Get the tagged message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="0"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, messageId, 'Message id should match');
	});


	it('Functional | GetMsgRequest for message which is flagged', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Flag the message
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			'<MsgActionRequest xmlns="urn:zimbraMail">' +
			'<action id="' + messageId + '" op="flag"/>' +
			'</MsgActionRequest>', authToken
		);
		assert.notExists(flagRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(flagRes.MsgActionResponse.action.op, 'flag', 'op should be flag');
		assert.equal(flagRes.MsgActionResponse.action.id, messageId, 'id should match');

		// Get the flagged message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" read="0" html="0"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, messageId, 'Message id should match');
	});


	it('Functional | TC to verify GetMsgRequest can access specific headers', async () => {
		// Create account and send message
		const { accountEmail, authToken } = await setupAccount();
		const subject = 'subject' + common.getUniqueString();
		const messageId = await sendMessage(accountEmail, authToken, subject, 'test content');

		// Get message with specific headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '">' +
			'<header n="From"/>' +
			'<header n="To"/>' +
			'<header n="Cc"/>' +
			'</m>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, messageId, 'Message id should match');

		// Verify To header contains account email
		assert.exists(msg._attrs, 'Message should contain _attrs');
		assert.exists(msg._attrs.To, 'To header should exist');
		assert.include(msg._attrs.To, accountEmail, 'To header should contain account email');
		assert.exists(msg._attrs.From, 'From header should exist');
	});


	it('Sanity | Verify the max attribute for GetMsgRequest truncates the message body (basic)', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a message with long body
		const mimeContent = 'To: foo@example.com\n' +
			'From:bar@example.com\n' +
			'Subject: testing when you have an invalid skin - another upgrade test\n' +
			'Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)\n' +
			'MIME-Version: 1.0\n' +
			'Content-Type: text/plain\n' +
			'\n' +
			'\n' +
			'The last two weeks have been tough for the No. 18 Cal football team. ' +
			'After sitting at No. 2 for a week, back-to-back losses have caused ' +
			'the Bears to plummet out of the top 10.\n' +
			'\n' +
			'Cal will even be an underdog for the first time Saturday when it travels ' +
			'to Sun Devil Stadium to play No. 7 Arizona State at 7 p.m.\n' +
			'\n' +
			'But even against the No. 4 team in the BCS, the Bears goals have not ' +
			'changed one bit.\n' +
			'\n' +
			'Even though you say, all the pressure should be on Arizona State because ' +
			'they are highly ranked and all that kind of stuff, there is still always ' +
			'the expectation to win for us, Cal coach Jeff Tedford said.\n';
		const messageId = await addMessage(authToken, '2', mimeContent);

		// Get message with max=10
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" max="10"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the body is truncated
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const mp = Array.isArray(msg.mp) ? msg.mp : [msg.mp];
		const textPart = mp.find(p => p && p.ct === 'text/plain');
		assert.exists(textPart, 'text/plain part should exist');
		assert.equal(textPart.truncated, '1', 'Body should be truncated');
	});


	it('Sanity | Verify if max is set to larger than the message size, the complete body is returned (text) 1', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a message with long body
		const mimeContent = 'To: foo@example.com\n' +
			'From: bar@example.com\n' +
			'Subject: testing when you have an invalid skin - another upgrade test\n' +
			'Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)\n' +
			'MIME-Version: 1.0\n' +
			'Content-Type: text/plain\n' +
			'\n' +
			'\n' +
			'The last two weeks have been tough for the No. 18 Cal football team. ' +
			'After sitting at No. 2 for a week, back-to-back losses have caused ' +
			'the Bears to plummet out of the top 10.\n' +
			'\n' +
			'Cal will even be an underdog for the first time Saturday when it travels ' +
			'to Sun Devil Stadium to play No. 7 Arizona State at 7 p.m.\n' +
			'\n' +
			'But even against the No. 4 team in the BCS, the Bears goals have not ' +
			'changed one bit.\n' +
			'\n' +
			'Even though you say, all the pressure should be on Arizona State because ' +
			'they are highly ranked and all that kind of stuff, there is still always ' +
			'the expectation to win for us, Cal coach Jeff Tedford said.\n';
		const messageId = await addMessage(authToken, '2', mimeContent);

		// Get message with max=1000 (larger than body)
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" max="1000"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the body is not truncated
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const mp = Array.isArray(msg.mp) ? msg.mp : [msg.mp];
		const textPart = mp.find(p => p && p.ct === 'text/plain');
		assert.exists(textPart, 'text/plain part should exist');

		// Verify content is not truncated
		assert.isUndefined(textPart.truncated, 'Body should not be truncated when max exceeds body size');
	});


	it('Sanity | Verify that max will truncate the message body (html)', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a multipart message with html
		const mimeContent = 'Date: Fri, 26 Oct 2007 16:19:02 -0700 (PDT)\n' +
			'From: foo@example.com\n' +
			'To: bar@example.com\n' +
			'Subject: the fourth quarter has belonged to anyone but Cal\n' +
			'MIME-Version: 1.0\n' +
			'Content-Type: multipart/alternative;\n' +
			'\tboundary="----=_Part_233_76654086.1193440742742"\n' +
			'X-Originating-IP: [10.10.131.107]\n' +
			'\n' +
			'------=_Part_233_76654086.1193440742742\n' +
			'Content-Type: text/plain; charset=utf-8\n' +
			'Content-Transfer-Encoding: 7bit\n' +
			'\n' +
			'As soon as the whistle sounds at the end of the third quarter, ' +
			'Cal fans lift up four fingers and chant Fourth Quarters Ours\n' +
			'\n' +
			'------=_Part_233_76654086.1193440742742\n' +
			'Content-Type: text/html; charset=utf-8\n' +
			'Content-Transfer-Encoding: 7bit\n' +
			'\n' +
			'<html><head><style type="text/css">body { font-family: Arial; ' +
			'font-size: 10pt; color: #000000}</style></head><body>As soon as ' +
			'the whistle sounds at the end of the third quarter, Cal fans ' +
			'lift up four fingers and chant Fourth Quarters Ours And with an ' +
			'offense that scores 35.1 points per game, why should it not be? ' +
			'The Bears have outscored opponents 70-55 in the final stanza ' +
			'this season.</body></html>\n' +
			'------=_Part_233_76654086.1193440742742--\n';
		const messageId = await addMessage(authToken, '2', mimeContent);

		// Get message with max=10 and html=1
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" html="1" max="10"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the body is truncated
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.id, 'message id should exist');
	});


	it('Sanity | Verify if max is set to larger than the message size, the complete body is returned (text) 2', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Add a multipart message
		const mimeContent = 'Date: Fri, 26 Oct 2007 16:19:02 -0700 (PDT)\n' +
			'From: foo@example.com\n' +
			'To: bar@example.com\n' +
			'Subject: the fourth quarter has belonged to anyone but Cal\n' +
			'MIME-Version: 1.0\n' +
			'Content-Type: multipart/alternative;\n' +
			'\tboundary="----=_Part_233_76654086.1193440742742"\n' +
			'X-Originating-IP: [10.10.131.107]\n' +
			'\n' +
			'------=_Part_233_76654086.1193440742742\n' +
			'Content-Type: text/plain; charset=utf-8\n' +
			'Content-Transfer-Encoding: 7bit\n' +
			'\n' +
			'As soon as the whistle sounds at the end of the third quarter, ' +
			'Cal fans lift up four fingers and chant Fourth Quarters Ours\n' +
			'\n' +
			'------=_Part_233_76654086.1193440742742\n' +
			'Content-Type: text/html; charset=utf-8\n' +
			'Content-Transfer-Encoding: 7bit\n' +
			'\n' +
			'<html><head><style type="text/css">body { font-family: Arial; ' +
			'font-size: 10pt; color: #000000}</style></head><body>As soon as ' +
			'the whistle sounds when the points matter most.</body></html>\n' +
			'------=_Part_233_76654086.1193440742742--\n';
		const messageId = await addMessage(authToken, '2', mimeContent);

		// Get message with max=2000 (larger than body)
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + messageId + '" max="2000"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the body is not truncated
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.id, 'message id should exist');
	});


	it('Functional | Helper test to import all messages associated with bug 3470', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Upload and add all 5 bug 3470 message files
		const files = ['10523a.txt', '10523b.txt', '10921.txt', '21037.txt', '8513.txt'];
		for (const file of files) {
			const filePath = path.join(config.projectRoot, 'mocha/data/bugs/3470/' + file);
			const aid = await soap.uploadFile(authToken, filePath);

			// Add message to inbox
			const addRes = await soap.makeSOAPEnvelopeAccount(
				'<AddMsgRequest xmlns="urn:zimbraMail">' +
				'<m l="2" aid="' + aid + '"/>' +
				'</AddMsgRequest>', authToken
			);
			assert.notExists(addRes.Fault, 'AddMsgRequest for ' + file + ' should not fault');
		}
	});


	it('Functional | Verify stringindexoutofbounds error for bug 32271', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Inject the mime message via LMTP
		const filePath = path.join(config.projectRoot, 'mocha/data/bugs/32271/mime.txt');
		await soap.injectMime(authToken, filePath);

		// Search for the injected message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>subject:(email01A)</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the message - should not cause stringindexoutofbounds
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + msgId + '"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.id, 'Message id should exist');
	});


	it('Functional | Inject a particular mime message for P4 messages using LMTP and verify the fragment part', async () => {
		// Create account
		const { authToken } = await setupAccount();

		// Inject the P4 mime message via LMTP
		const filePath = path.join(config.projectRoot, 'mocha/data/bug53779/msg-01.txt');
		await soap.injectMime(authToken, filePath);

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Search for the injected message using actual subject from the mime file
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			'<SearchRequest xmlns="urn:zimbraMail" types="message">' +
			'<query>subject:(CheckLicenseRequest_AccountSetup)</query>' +
			'</SearchRequest>', authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the injected message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			'<GetMsgRequest xmlns="urn:zimbraMail">' +
			'<m id="' + msgId + '"/>' +
			'</GetMsgRequest>', authToken
		);

		// Verify the fragment contains expected text
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.fr, 'Fragment should exist');
		assert.include(msg.fr, 'Affected files', 'Fragment should contain Affected files text');
	});
});
