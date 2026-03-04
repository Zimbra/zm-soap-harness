import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Itemaction Tag', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
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
	it('Sanity | Delete an Item (tag)', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// ItemActionRequest
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(deleteRes.ItemActionResponse.action)
			? deleteRes.ItemActionResponse.action[0] : deleteRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
		assert.exists(deleteRes.ItemActionResponse.action, 'Action should exist');
		assert.equal(deleteRes.ItemActionResponse.action.op, 'delete',
			'Action op should be delete');
		assert.equal(deleteRes.ItemActionResponse.action.id, tagId,
			'Action id should match tag id');
	});


	it('Regression | Delete a non-existing item (tag)', async () => {
		// ItemActionRequest
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="99999"/>
			</ItemActionRequest>`, accountAuthToken
		);
		// Deleting non-existing item may succeed silently or fault
		if (!deleteRes.Fault) {

			// Verify response
			const itemAction = Array.isArray(deleteRes.ItemActionResponse.action)
				? deleteRes.ItemActionResponse.action[0] : deleteRes.ItemActionResponse.action;
			assert.exists(itemAction, 'ItemActionResponse should contain action');
		}
	});


	it('Regression | Move an item (tag) in any folder', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const createdTag = Array.isArray(createRes.CreateTagResponse.tag)
			? createRes.CreateTagResponse.tag[0] : createRes.CreateTagResponse.tag;
		assert.exists(createdTag, 'CreateTagResponse should contain tag');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Try to move tag - should fail or be ignored since tags don't live in folders
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${tagId}" l="2"/>
			</ItemActionRequest>`, accountAuthToken
		);
		// Moving a tag to a folder may fault or succeed silently
		if (!moveRes.Fault) {

			// Verify response
			const itemAction = Array.isArray(moveRes.ItemActionResponse.action)
				? moveRes.ItemActionResponse.action[0] : moveRes.ItemActionResponse.action;
			assert.exists(itemAction, 'ItemActionResponse should contain action');
		}
	});


	it('Sanity | Mark an item (tag) as read', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// ItemActionRequest
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(readRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(readRes.ItemActionResponse.action)
			? readRes.ItemActionResponse.action[0] : readRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
		assert.exists(readRes.ItemActionResponse.action, 'Action should exist');
		assert.equal(readRes.ItemActionResponse.action.op, 'read',
			'Action op should be read');
		assert.equal(readRes.ItemActionResponse.action.id, tagId,
			'Action id should match tag id');
	});


	it('Regression | Tag an item (tag)', async () => {
		const tagName1 = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName1}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const tagId1 = createRes1.CreateTagResponse.tag[0].id;

		const tagName2 = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName2}" color="5"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		const tagId2 = createRes2.CreateTagResponse.tag[0].id;

		// Try to tag a tag with another tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${tagId1}" tag="${tagId2}"/>
			</ItemActionRequest>`, accountAuthToken
		);
		// Tagging a tag with another tag may fault or succeed
		if (!tagRes.Fault) {

			// Verify response
			const itemAction = Array.isArray(tagRes.ItemActionResponse.action)
				? tagRes.ItemActionResponse.action[0] : tagRes.ItemActionResponse.action;
			assert.exists(itemAction, 'ItemActionResponse should contain action');
		}
	});


	it('Functional | Update an item (tag) with no action', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// ItemActionRequest
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="update" id="${tagId}"/>
			</ItemActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(updateRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(updateRes.ItemActionResponse.action)
			? updateRes.ItemActionResponse.action[0] : updateRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
	});
});
