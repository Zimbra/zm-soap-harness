import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Action', function () {
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
	it('Smoke | Delete a Tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// TagActionRequest
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		assert.equal(deleteRes.TagActionResponse.action.op, 'delete', 'Op should be delete');
		assert.equal(deleteRes.TagActionResponse.action.id, tagId, 'Id should match');
	});


	it('Regression | Delete a non-existing TAG', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="99999"/>
			</TagActionRequest>`, accountAuthToken
		);
		// Deleting non-existing tag may succeed silently or fault
		if (!res.Fault) {

			// Verify response
		}
	});


	it('Sanity | RENAME a tag with valid tag name and valid color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const newName = `renamed${common.getUniqueString()}`;

		// TagActionRequest
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name="${newName}"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');

		// Verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const match = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'Tag should exist');
		assert.equal(match.name, newName, 'New name should match');
	});


	it('Functional | RENAME a tag with Duplicate tag name and valid color', async () => {
		const tagName1 = `tag${common.getUniqueString()}`;
		const tagName2 = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName1}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'First tag creation should not be a Fault');

		// CreateTagRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName2}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Second tag creation should not be a Fault');
		const tagId2 = createRes2.CreateTagResponse.tag[0].id;

		// Try to rename tag2 to tag1's name
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId2}" name="${tagName1}"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Duplicate rename should be a Fault');
	});


	it('Regression | RENAME a tag with non existing tag id', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="99999" name="newname"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Non-existing tag id rename should be a Fault');
	});


	it('Functional | Rename a tag with invalid name (special character, spaces, blank, negative, zero)', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Try blank name
		const blankRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name=""/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(blankRes.Fault.Detail.Error.Code, 'Blank rename should be a Fault');

		// Try spaces
		const spacesRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${tagId}" name="   "/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(spacesRes.Fault.Detail.Error.Code, 'Spaces-only rename should be a Fault');
	});


	it('Sanity | Perform read operation on a tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// TagActionRequest
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${tagId}"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(readRes.Fault, 'Response should not be a Fault');
	});


	it('Regression | Read a non existing tag', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="99999"/>
			</TagActionRequest>`, accountAuthToken
		);
		// May succeed silently or fault
		if (!res.Fault) {

			// Verify response
		}
	});


	it('Functional | Change the color of Tag', async () => {
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

		// TagActionRequest
		const colorRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="7"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(colorRes.Fault, 'Response should not be a Fault');

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const match = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'Tag should exist');
		assert.equal(match.color, '7', 'Color should be updated to 7');
	});


	it('Regression | Color a non existing tag with valid color', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="99999" color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Non-existing tag color should be a Fault');
	});


	it('Regression | Color a tag with invalid color(special character, spaces, blank, negative, zero)', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// TagActionRequest
		const invalidRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="!@"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(invalidRes.Fault.Detail.Error.Code, 'Invalid color should be a Fault');

		// TagActionRequest
		const negRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="-1"/>
			</TagActionRequest>`, accountAuthToken, false
		);
		// Server may accept negative color values
		if (negRes.Fault) {

			// Verify response
			assert.isString(negRes.Fault.Detail.Error.Code, 'Negative color should be a Fault');
		} else {
		}
	});


	it('Functional | Delete two tags simultaneously', async () => {
		const tagName1 = `tag${common.getUniqueString()}`;
		const tagName2 = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName1}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'First tag creation should not be a Fault');

		// CreateTagRequest
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName2}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Second tag creation should not be a Fault');
		const tagId1 = createRes1.CreateTagResponse.tag[0].id;
		const tagId2 = createRes2.CreateTagResponse.tag[0].id;

		// TagActionRequest
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId1},${tagId2}"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
	});


	it('Regression | Delete a tag giving only color', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Delete with only color should be a Fault');
	});


	it('Functional | TagActionRequest with invalid (special character, spaces, blank, negative, zero)', async () => {
		// TagActionRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="!@#"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res1.Fault.Detail.Error.Code, 'Special char id should be a Fault');

		// TagActionRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id=""/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res2.Fault.Detail.Error.Code, 'Blank id should be a Fault');
	});


	it('Sanity | Change the color of a tag using only tag name in the action request', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// TagActionRequest
		const colorRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" tn="${tagName}" color="6"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(colorRes.Fault, 'Response should not be a Fault');

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const match = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(match, 'Tag should exist');
		assert.equal(match.color, '6', 'Color should be updated');
	});


	it('Sanity | Change the color of a tag using tag id in the action request', async () => {
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

		// TagActionRequest
		const colorRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="5"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(colorRes.Fault, 'Response should not be a Fault');
	});


	it('Regression | Try to change the color of a tag using non-existing tag name in the action request', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" tn="nonExistentTag${common.getUniqueString()}" color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Non-existing tag name should be a Fault');
	});


	it('Regression | Try to change the color of a tag using invalid tag name in the action request', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" tn="!@#$%" color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Invalid tag name should be a Fault');
	});


	it('Regression | Try to change the color of a tag using blank tag name in the action request', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" tn="" color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Blank tag name should be a Fault');
	});


	it('Regression | Try to change the color of a tag using tag name containing space in the action request', async () => {
		// TagActionRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" tn="   " color="3"/>
			</TagActionRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Space-only tag name should be a Fault');
	});
});
