import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 91799', function () {
	this.timeout(60 * 1000);
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
	it('Sanity | Verify conversation unread count in SearchResponse', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Inject the MIME message
		const filePath = path.join(config.projectRoot, 'mocha/data/bug91799/mime.txt');
		// Get account auth token
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		await soap.injectMime(accountAuthToken, filePath);

		// Search for conversations in Inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail">
				<query>in:Inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify unread conversation attributes
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conversations = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(conversations[0], 'Conversation should exist');
		assert.include(conversations[0].f, 'u', 'Flags should contain unread');
		assert.equal(String(conversations[0].u), '1', 'Unread count should be 1');
	});
});
