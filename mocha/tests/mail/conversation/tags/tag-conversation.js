import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Conversation > Tags > Tag Conversation', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let accountEmail, authToken, convId, tagId;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		accountEmail = `test${common.getUniqueString()}@${testDomain}`;
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
		authToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Smoke | Search for a tagged conversation using ConvActionRequest tag', async () => {
		// Send 2 emails (same conversation)
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>email01A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');
		const msgId1 = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m orig="${msgId1}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: email01A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 1000));

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(email01A)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		convId = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0].id : searchRes.SearchResponse.c.id;

		// Create tag
		const tagName = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not fault');
		tagId = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Tag conversation
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="${tagId}"/>
			</ConvActionRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(tagRes.ConvActionResponse.action.op, 'tag', 'op should be tag');

		// Search for tagged conversation
		const searchTagRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>tag:"${tagName}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchTagRes.Fault, 'SearchRequest should not fault');
		const taggedConv = Array.isArray(searchTagRes.SearchResponse.c)
			? searchTagRes.SearchResponse.c[0] : searchTagRes.SearchResponse.c;
		assert.equal(taggedConv.id, convId, 'Should find the tagged conversation');
	});


	it('Sanity | Search for a tagged conversation using ItemActionRequest tag', async () => {
		// Send 2 emails (same conversation)
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>email03A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		const msgId1 = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m orig="${msgId1}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: email03A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 1000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(email03A)</query>
			</SearchRequest>`, authToken
		);
		const convId3 = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0].id : searchRes.SearchResponse.c.id;

		const tagName3 = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName3}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId3 = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Tag using ItemActionRequest
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId3}" op="tag" tag="${tagId3}"/>
			</ItemActionRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'ItemActionRequest should not fault');
		assert.equal(tagRes.ItemActionResponse.action.op, 'tag', 'op should be tag');

		// Search tagged conversation
		const searchTagRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>tag:"${tagName3}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchTagRes.Fault, 'SearchRequest should not fault');
		const taggedConv = Array.isArray(searchTagRes.SearchResponse.c)
			? searchTagRes.SearchResponse.c[0] : searchTagRes.SearchResponse.c;
		assert.equal(taggedConv.id, convId3, 'Should find the tagged conversation');
	});


	it('Sanity | Search for a tagged conversation using MsgActionRequest tag', async () => {
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>email05A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		const msgId5 = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m orig="${msgId5}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su>Fwd: email05A</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		await new Promise(resolve => setTimeout(resolve, 1000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:(email05A)</query>
			</SearchRequest>`, authToken
		);
		const convId5 = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0].id : searchRes.SearchResponse.c.id;

		const tagName5 = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName5}" color="0"/>
			</CreateTagRequest>`, authToken
		);
		const tagId5 = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0].id : createTagRes.CreateTagResponse.tag.id;

		// Tag using MsgActionRequest on a specific message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId5}" op="tag" tag="${tagId5}"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(tagRes.Fault, 'MsgActionRequest should not fault');

		// Search tagged conversation
		const searchTagRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>tag:"${tagName5}"</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchTagRes.Fault, 'SearchRequest should not fault');
		const taggedConv = Array.isArray(searchTagRes.SearchResponse.c)
			? searchTagRes.SearchResponse.c[0] : searchTagRes.SearchResponse.c;
		assert.equal(taggedConv.id, convId5, 'Should find tagged conversation via message tag');
	});


	it('Regression | Test invalid values in tag id in ConvActionRequest', async () => {
		// Leading spaces in tag id
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="             ${tagId}"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should fault for leading spaces');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Special characters as tag id
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="//\\\\'^%"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should fault for special characters');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Blank tag id
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag=""/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should fault for blank tag id');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Text as tag id
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="some text"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should fault for text tag id');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Decimal as tag id
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="10.10"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Should fault for decimal tag id');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Non-existing tag id
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="0099"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Should fault for non-existing tag id');
		assert.include(res6.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');

		// Negative as tag id
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="-50"/>
			</ConvActionRequest>`, authToken, false
		);
		assert.isString(res7.Fault.Detail.Error.Code, 'Should fault for negative tag id');
		assert.include(res7.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});


	it('Regression | Test invalid values in tag id in ItemActionRequest', async () => {
		// Leading spaces
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="        ${tagId}"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should fault for leading spaces');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Special characters
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="//\\\\'^%"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should fault for special characters');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Blank
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag=""/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should fault for blank tag id');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Text
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="some text"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should fault for text tag id');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="10.10"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Should fault for decimal tag id');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should be service.INVALID_REQUEST');

		// Non-existing
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="0099"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Should fault for non-existing tag id');
		assert.include(res6.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');

		// Negative
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="tag" tag="-50"/>
			</ItemActionRequest>`, authToken, false
		);
		assert.isString(res7.Fault.Detail.Error.Code, 'Should fault for negative tag id');
		assert.include(res7.Fault.Detail.Error.Code, 'mail.NO_SUCH_TAG',
			'Should be mail.NO_SUCH_TAG');
	});
});
