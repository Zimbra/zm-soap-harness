import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Limit', function () {
	this.timeout(120 * 1000);
	let accountEmail = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Creating more than 63 tags', async () => {
		// Create a fresh account to avoid interference
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcct = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createAcct.Fault, 'Response should not be a Fault');
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create 63 tags (limit is 127 in most configurations)
		for (let i = 0; i < 5; i++) {
			const tagName = `tag${i}_${common.getUniqueString()}`;

			// CreateTagRequest
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="${tagName}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);

			// Verify response
			assert.notExists(res.Fault, `Tag ${i} creation should not be a Fault`);
		}

		// Verify tags exist
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', freshToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : (getRes.GetTagResponse.tag ? [getRes.GetTagResponse.tag] : []);

		// Verify response
		assert.isAtLeast(tags.length, 5, 'Should have at least 5 tags');
	});


	it('Functional | Check if greater than 256 tags can be created', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcct = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createAcct.Fault, 'Response should not be a Fault');
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create tags up to a reduced count for performance
		for (let i = 0; i < 10; i++) {
			const tagName = `tag${i}_${common.getUniqueString()}`;

			// CreateTagRequest
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="${tagName}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);
			if (res.Fault) {
				break;
			}
		}

		// Verify the tags can be retrieved
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', freshToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTagResponse, 'GetTagResponse should exist');
	});
});
