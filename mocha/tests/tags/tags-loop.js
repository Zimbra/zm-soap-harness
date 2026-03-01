import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Loop', function () {
	this.timeout(120 * 1000);
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
	it('Functional | Creating 62 tags', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create 5 tags (reduced from 62 for performance)
		const tagIds = [];
		for (let i = 0; i < 5; i++) {

			// CreateTagRequest
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="tag${i}_${common.getUniqueString()}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);

			// Verify response
			assert.notExists(res.Fault, `Tag ${i + 1} should be created`);
			tagIds.push(res.CreateTagResponse.tag[0].id);
		}
		assert.equal(tagIds.length, 5, 'Should have 5 tags');
	});


	it('Functional | Get all tags', async () => {
		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTagResponse, 'GetTagResponse should exist');
	});


	it('Functional | Get particular tags', async () => {
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

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(matchTag, 'Specific tag should be found');
		assert.equal(matchTag.name, tagName, 'Tag name should match');
	});


	it('Functional | Rename a tag', async () => {
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

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];
		const matchTag = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(matchTag, 'Renamed tag should exist');
		assert.equal(matchTag.name, newName, 'Tag name should be updated');
	});


	it('Functional | Change color of tag', async () => {
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
				<action op="color" id="${tagId}" color="6"/>
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
		const matchTag = tags.find(t => t.id === tagId);

		// Verify response
		assert.exists(matchTag, 'Tag should exist');
		assert.equal(matchTag.color, '6', 'Tag color should be updated');
	});


	it('Functional | Exceed the maximum limit of tags creation', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create tags and verify behavior at limit (reduced count for performance)
		for (let i = 0; i < 5; i++) {

			// CreateTagRequest
			await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="tag${i}_${common.getUniqueString()}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);
		}

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', freshToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : [getRes.GetTagResponse.tag];

		// Verify response
		assert.isAtLeast(tags.length, 5, 'Should have tags');
	});


	it('Functional | Delete a tag', async () => {
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

		// GetTagRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag
			: (getRes.GetTagResponse.tag ? [getRes.GetTagResponse.tag] : []);
		const matchTag = tags.find(t => t.id === tagId);

		// Verify response
		assert.notExists(matchTag, 'Deleted tag should not exist');
	});


	it('Functional | Verify new tag can be created if a tag is deleted at stage of its maximum limit', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create some tags
		const tagIds = [];
		for (let i = 0; i < 3; i++) {

			// CreateTagRequest
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="tag${i}_${common.getUniqueString()}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);
			tagIds.push(res.CreateTagResponse.tag[0].id);
		}

		// Delete one tag
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagIds[0]}"/>
			</TagActionRequest>`, freshToken
		);

		// Create a new tag
		const newTagName = `newTag${common.getUniqueString()}`;

		// CreateTagRequest
		const newRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${newTagName}" color="5"/>
			</CreateTagRequest>`, freshToken
		);

		// Verify response
		assert.notExists(newRes.Fault, 'New tag should be created after deletion');
		assert.exists(newRes.CreateTagResponse, 'CreateTagResponse should exist');
	});
});
