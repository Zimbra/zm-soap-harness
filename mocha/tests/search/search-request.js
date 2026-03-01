import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0
Test content</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Smoke | Smoke test for BrowseRequest', async () => {
		const cosName = `cos${common.getUniqueString()}`;

		// CreateCos
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraBatchedIndexingSize">0</a>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const cos01_id = res2.CreateCosResponse.cos[0].id;

		// Create test account with COS
		const account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos01_id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// BrowseRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="domains" />`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.BrowseResponse, 'Response element should exist');
	});
});
