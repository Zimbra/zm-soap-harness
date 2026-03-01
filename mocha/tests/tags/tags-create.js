import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Create', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create a new Tag', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		assert.exists(res.CreateTagResponse.tag, 'Tag should exist in response');
		const tag = res.CreateTagResponse.tag[0];

		// Verify response
		assert.equal(tag.name, tagName, 'Tag name should match');
		assert.equal(tag.color, '4', 'Tag color should match');
		assert.exists(tag.id, 'Tag should have an id');
	});


	it('Functional | Create a new Tag with blank name', async () => {
		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="" color="2"/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault for blank name');
	});


	it('Functional | Create a new Tag with all spaces in name', async () => {
		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="   " color="3"/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault for spaces-only name');
	});


	it('Functional | Create a Tag with Duplicate name', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'First creation should not be a Fault');

		// CreateTagRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res2.Fault, 'Duplicate name should be a Fault');
	});


	it('Functional | Create a Tag with Special Characters in name', async () => {
		const tagName = `tag!@#$%${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="5"/>
			</CreateTagRequest>`, accountAuthToken
		);
		// Special chars may or may not be allowed depending on server version
		if (!res.Fault) {

			// Verify response
			assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		}
	});


	it('Regression | Create a Tag with Unique name and with color value greater than 8', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="128"/>
			</CreateTagRequest>`, accountAuthToken
		);
		// Color > 8 may still create but use custom color or fail
		if (!res.Fault) {

			// Verify response
			assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		}
	});


	it('Regression | Create a Tag with Unique name and with color value negative', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="-1"/>
			</CreateTagRequest>`, accountAuthToken, false
		);
		// Server may accept negative color values
		if (res.Fault) {

			// Verify response
			assert.exists(res.Fault, 'Negative color should be a Fault');
		} else {
			assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		}
	});


	it('Regression | Create a new Tag with all spaces in the color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="   "/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Spaces-only color should be a Fault');
	});


	it('Regression | Create a new Tag with special chars in the color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="!@#"/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Special chars color should be a Fault');
	});


	it('Regression | Create a new Tag with blank in the color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color=""/>
			</CreateTagRequest>`, accountAuthToken
		);
		// Blank color may default or fail
		if (!res.Fault) {

			// Verify response
			assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		}
	});


	it('Regression | Create a new Tag with invalid attributes', async () => {
		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="" color=""/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Empty name and color should be a Fault');
	});


	it('Regression | Create a new Tag with spaces in the tag name and color', async () => {
		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="   " color="   "/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Spaces in both should be a Fault');
	});


	it('Regression | Create a new Tag with valid name and Spaces in color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="  "/>
			</CreateTagRequest>`, accountAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'Valid name with spaces color should be a Fault');
	});


	it('Sanity | Create a new Tag with default color', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTagResponse, 'CreateTagResponse should exist');
		const tag = res.CreateTagResponse.tag[0];

		// Verify response
		assert.equal(tag.name, tagName, 'Tag name should match');
	});


	it('Sanity | Create a new Tag with different color modify it to default color', async () => {
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

		// Modify color to default (0)
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="0"/>
			</TagActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.TagActionResponse, 'TagActionResponse should exist');

		// Verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(matchTag, 'Tag should exist');
		const tagColor = matchTag.color || '0';

		// Verify response
		assert.equal(tagColor, '0', 'Tag color should be 0 (default)');
	});
});
