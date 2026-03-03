import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Drafts > Search Draft Basic', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const message1 = {
		subject: `Subject${common.getUniqueString()}`,
		content: `content${common.getUniqueString()}`
	};

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
	it('Sanity | Search a draft by subject', async () => {
		// SaveDraftRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="foo@example.com"/>
					<su> ${message1.subject} </su>
					<mp ct="text/plain">
						<content> ${message1.content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		message1.id = res1.SaveDraftResponse.m[0].id;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> subject:${message1.subject} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search a draft by content', async () => {
		// SaveDraftRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="foo@example.com"/>
					<su> ${message1.subject} </su>
					<mp ct="text/plain">
						<content> ${message1.content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		message1.id = res1.SaveDraftResponse.m[0].id;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> content:${message1.content} </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
	});
});
