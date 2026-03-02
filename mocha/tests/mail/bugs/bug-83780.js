import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 83780', function () {
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
	it('Sanity | Test that zimbraAttachmentsViewInHtmlOnly is returned in GetInfoResponse', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send GetInfoRequest with sections=attrs
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount" sections="attrs"/>`, authToken
		);
		assert.notExists(res.Fault, 'GetInfoRequest should not fault');
		assert.exists(res.GetInfoResponse, 'GetInfoResponse should exist');

		// Check zimbraAttachmentsViewInHtmlOnly is in attrs
		const attrs = res.GetInfoResponse.attrs._attrs || res.GetInfoResponse.attrs;
		assert.exists(attrs, 'attrs should exist');
		assert.equal(attrs.zimbraAttachmentsViewInHtmlOnly, 'FALSE', 'zimbraAttachmentsViewInHtmlOnly should be FALSE');
	});
});
