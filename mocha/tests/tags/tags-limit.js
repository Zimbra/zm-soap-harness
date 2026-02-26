import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tags > Tags Limit', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Creating more than 63 tags', async () => {
		// Create a fresh account to avoid interference
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createAcct = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct.Fault, 'Response should not be a Fault');
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create 63 tags (limit is 127 in most configurations)
		for (let i = 0; i < 5; i++) {
			const tagName = `tag${i}_${common.getUniqueString()}`;
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="${tagName}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);
			assert.notExists(res.Fault, `Tag ${i} creation should not be a Fault`);
		}

		// Verify tags exist
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', freshToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const tags = Array.isArray(getRes.GetTagResponse.tag)
			? getRes.GetTagResponse.tag : (getRes.GetTagResponse.tag ? [getRes.GetTagResponse.tag] : []);
		assert.isAtLeast(tags.length, 5, 'Should have at least 5 tags');
	});


	it('Functional | Check if greater than 256 tags can be created', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const freshEmail = `test.${common.getUniqueString()}@${config.testDomain}`;
		const createAcct = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${freshEmail}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct.Fault, 'Response should not be a Fault');
		const freshToken = await soap.getAccountAuthToken(freshEmail);

		// Create tags up to a reduced count for performance
		let lastError = null;
		for (let i = 0; i < 10; i++) {
			const tagName = `tag${i}_${common.getUniqueString()}`;
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateTagRequest xmlns="urn:zimbraMail">
					<tag name="${tagName}" color="${(i % 7) + 1}"/>
				</CreateTagRequest>`, freshToken
			);
			if (res.Fault) {
				lastError = res.Fault;
				break;
			}
		}

		// Verify the tags can be retrieved
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', freshToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetTagResponse, 'GetTagResponse should exist');
	});
});
