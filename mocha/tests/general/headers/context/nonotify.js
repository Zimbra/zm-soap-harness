import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Context > Nonotify', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Verify nonotify should turn off notifications, but maintain sessions', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateTagRequest should not fault');
		const createdTag = Array.isArray(createRes.CreateTagResponse.tag)
			? createRes.CreateTagResponse.tag[0] : createRes.CreateTagResponse.tag;
		assert.exists(createdTag, 'CreateTagResponse should contain tag');
	});
});
