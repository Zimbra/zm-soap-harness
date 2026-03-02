import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 28727', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Mail with non-2047 Subject', async () => {
		// Create account with default charset ISO-2022-JP
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefMailDefaultCharset">ISO-2022-JP</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the MIME message with non-2047 subject
		const filePath = path.join(config.projectRoot, 'mocha/data/bug28727/263-15.msg');
		await soap.injectMime(authToken, filePath);

		// Search for the message and verify subject is not garbled
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:anywhere from:admin@zcs.srao.com</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should be found');
		assert.include(msg.su, 'テスト', 'Subject should contain Japanese characters');
	});
});
