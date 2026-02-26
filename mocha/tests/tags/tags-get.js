import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Get', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | get all tags', async () => {
		// Create a tag first to ensure there is at least one
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="2"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTagResponse, 'GetTagResponse should exist');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : (getRes.GetTagResponse.tag ? [getRes.GetTagResponse.tag] : []);
		assert.isAbove(tags.length, 0, 'Should have at least one tag');
	});


	it('Sanity | Create a tag and GetTagRequest it', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);
		assert.exists(matchTag, 'Created tag should appear in GetTagResponse');
		assert.equal(matchTag.name, tagName, 'Tag name should match');
		assert.equal(matchTag.color, '3', 'Tag color should match');
	});


	it('Sanity | Verify a deleted tag no longer appears in the GetTagRequest list', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Delete the tag
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, accountAuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		// Verify it's gone
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag
			: (getRes.GetTagResponse.tag ? [getRes.GetTagResponse.tag] : []);
		const matchTag = tags.find(t => t.id === tagId);
		assert.notExists(matchTag, 'Deleted tag should not appear in GetTagResponse');
	});
});
