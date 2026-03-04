import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Conversation > Tcon > Conv Action Request Tcon', function () {
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
	it('Regression | ConvActionRequest invalid values of tcon', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to self to create a conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content of the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Forward the message to create a conversation
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');
		const convId = conv.id;

		// ConvActionRequest with tcon leading spaces - should fail
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="     s"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Leading spaces tcon should fault');
		assert.include(res1.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Leading spaces should give INVALID_REQUEST');

		// ConvActionRequest with tcon trailing spaces - should fail
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="s      "/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Trailing spaces tcon should fault');
		assert.include(res2.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Trailing spaces should give INVALID_REQUEST');

		// ConvActionRequest with tcon both leading and trailing spaces
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="         s      "/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Both spaces tcon should fault');
		assert.include(res3.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Both spaces should give INVALID_REQUEST');

		// ConvActionRequest with spaces only as tcon
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="           "/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Spaces only tcon should fault');
		assert.include(res4.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Spaces only should give INVALID_REQUEST');

		// ConvActionRequest with special characters as tcon
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="//\\\\'^%"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Special chars tcon should fault');
		assert.include(res5.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Special chars should give INVALID_REQUEST');

		// ConvActionRequest with text as tcon
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="some text"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Text tcon should fault');
		assert.include(res6.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Text should give INVALID_REQUEST');

		// ConvActionRequest with invalid alphabet as tcon
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="z"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res7.Fault.Detail.Error.Code, 'Invalid alphabet tcon should fault');
		assert.include(res7.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Invalid alphabet should give INVALID_REQUEST');

		// ConvActionRequest with invalid number as tcon
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="0099"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res8.Fault.Detail.Error.Code, 'Invalid number tcon should fault');
		assert.include(res8.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Invalid number should give INVALID_REQUEST');

		// ConvActionRequest with negative number as tcon
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="-50"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res9.Fault.Detail.Error.Code, 'Negative number tcon should fault');
		assert.include(res9.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Negative number should give INVALID_REQUEST');

		// ConvActionRequest with decimal number as tcon
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="read" tcon="10.10"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res10.Fault.Detail.Error.Code, 'Decimal number tcon should fault');
		assert.include(res10.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Decimal number should give INVALID_REQUEST');
	});


	it('Sanity | ConvActionRequest with combination of constraints of tcon', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send a message to self to create a conversation
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content of the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Forward the message to create a conversation
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');

		// ConvActionRequest with valid tcon combination "tj"
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${conv.id}" op="read" tcon="tj"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(res.Fault, 'ConvActionRequest should not fault');
		const action = Array.isArray(res.ConvActionResponse.action)
			? res.ConvActionResponse.action[0] : res.ConvActionResponse.action;
		assert.equal(action.op, 'read', 'Operation should be read');
		assert.equal(String(action.id), String(conv.id), 'ID should match');
	});
});
