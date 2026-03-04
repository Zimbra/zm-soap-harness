import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Fmt > Sync Tags', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let messageId, tagName;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
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
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create a tag
		tagName = 'tag' + common.getUniqueString();

		// CreateTagRequest
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}"/>
			</CreateTagRequest>`, account1Token
		);

		// Verify response
		assert.notExists(tagRes.Fault, 'Response should not be a Fault');
		const tag = tagRes.CreateTagResponse?.tag;
		const tagId = (Array.isArray(tag) ? tag[0] : tag).id;

		// Add message and tag it
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" t="${tagId}">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: tagTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\ntag test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		messageId = addRes.AddMsgResponse?.m?.id
			|| (Array.isArray(addRes.AddMsgResponse?.m)
				? addRes.AddMsgResponse.m[0].id : undefined);
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
	it('Sanity | Verify X-Zimbra-Tags header contains tag name', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Tags', 'Should contain X-Zimbra-Tags header');
		assert.include(res.body, tagName, 'Should contain the tag name');
	});


	it('Sanity | Verify tagged message has correct tag in sync format', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, tagName, 'Tag name should appear in sync output');
	});


	it('Sanity | Verify creating second tag and tagging message', async () => {
		const tag2Name = 'tag2' + common.getUniqueString();

		// CreateTagRequest
		const tag2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag2Name}"/>
			</CreateTagRequest>`, account1Token
		);

		// Verify response
		assert.notExists(tag2Res.Fault, 'Response should not be a Fault');
		const tag2 = tag2Res.CreateTagResponse?.tag;
		const tag2Id = (Array.isArray(tag2) ? tag2[0] : tag2).id;

		// Add new message with this tag
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" t="${tag2Id}">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: tagTest2\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\ntag test 2 content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		const msg2Id = addRes.AddMsgResponse?.m?.id
			|| (Array.isArray(addRes.AddMsgResponse?.m)
				? addRes.AddMsgResponse.m[0].id : undefined);

		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: msg2Id,
			fmt: 'sync'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'X-Zimbra-Tags', 'Should contain X-Zimbra-Tags');
		assert.include(res.body, tag2Name, 'Should contain second tag name');
	});
});
