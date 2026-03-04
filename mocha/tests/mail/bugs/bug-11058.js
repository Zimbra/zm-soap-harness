import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 11058', function () {
	this.timeout(120 * 1000);
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

	// Tests
	it('Sanity | SearchResponse,GetMsgResponse should have tn attribute with tag name', async () => {
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

		// Create a tag
		const tagName = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(createTagRes.CreateTagResponse.tag) ? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Add a message to inbox
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>Subject: hello1
do it
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const messageId = (Array.isArray(addMsgRes.AddMsgResponse.m) ? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m).id;

		// Tag the message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'MsgActionRequest should not fault');
		assert.equal(tagRes.MsgActionResponse.action.op, 'tag', 'op should be tag');

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>hello1</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.equal(msg.tn, tagName, 'SearchResponse message should have tn attribute with tag name');

		// Get the message and verify tn attribute
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m) ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(getMsg.tn, tagName, 'GetMsgResponse should have tn attribute with tag name');
	});


	it('Sanity | SearchConvRequest,GetConvRequest should have tn attribute with tag name', async () => {
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

		// Set threading to strict
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${accountEmail}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctRes.Fault, 'GetAccountRequest should not fault');
		const acct = Array.isArray(acctRes.GetAccountResponse.account) ? acctRes.GetAccountResponse.account[0] : acctRes.GetAccountResponse.account;
		const accountId = acct.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailThreadingAlgorithm">strict</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Create a tag
		const tagName = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(createTagRes.CreateTagResponse.tag) ? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Inject mime messages to create a conversation
		const basePath = path.join(config.projectRoot, 'mocha/data/bug375a');
		const files = ['message1.txt', 'message2.txt', 'message3.txt', 'message4.txt', 'message5.txt', 'message6.txt']
			.map(f => path.join(basePath, f)).join(',');
		await soap.injectMime(authToken, files);

		// Search for the conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(message1)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const convId = conv.id;

		// Tag the conversation
		const convTagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(convTagRes.Fault, 'ConvActionRequest should not fault');

		// SearchConvRequest - verify tn attribute
		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}">
				<query>subject:(message1)</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(searchConvRes.Fault, 'SearchConvRequest should not fault');
		const convMsg = Array.isArray(searchConvRes.SearchConvResponse.m)
			? searchConvRes.SearchConvResponse.m[0] : searchConvRes.SearchConvResponse.m;
		assert.equal(convMsg.tn, tagName, 'SearchConvResponse message should have tn with tag name');

		// GetConvRequest - verify tn attribute
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, authToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const convObj = Array.isArray(getConvRes.GetConvResponse.c) ? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		assert.equal(convObj.tn, tagName, 'GetConvResponse should have tn with tag name');
	});


	it('Sanity | GetContactsRequest should have tn attribute with tag name', async () => {
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

		// Create a tag
		const tagName = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		const tagObj = Array.isArray(createTagRes.CreateTagResponse.tag) ? createTagRes.CreateTagResponse.tag[0] : createTagRes.CreateTagResponse.tag;
		const tagId = tagObj.id;

		// Create a contact
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const contactEmail = `email${common.getUniqueString()}@domain.com`;
		const createContactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, authToken
		);
		assert.notExists(createContactRes.Fault, 'CreateContactRequest should not fault');
		const contact = Array.isArray(createContactRes.CreateContactResponse.cn) ? createContactRes.CreateContactResponse.cn[0] : createContactRes.CreateContactResponse.cn;
		const contactId = contact.id;

		// Tag the contact
		const tagContactRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="tag" tag="${tagId}"/>
			</ContactActionRequest>`, authToken
		);
		assert.notExists(tagContactRes.Fault, 'ContactActionRequest should not fault');
		assert.equal(tagContactRes.ContactActionResponse.action.op, 'tag', 'op should be tag');

		// Get the contact and verify tn attribute
		const getContactRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, authToken
		);
		assert.notExists(getContactRes.Fault, 'GetContactsRequest should not fault');
		const cn = Array.isArray(getContactRes.GetContactsResponse.cn)
			? getContactRes.GetContactsResponse.cn[0] : getContactRes.GetContactsResponse.cn;
		assert.equal(cn.tn, tagName, 'GetContactsResponse should have tn attribute with tag name');
	});
});
