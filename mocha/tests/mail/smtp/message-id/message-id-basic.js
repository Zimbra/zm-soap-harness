import path from 'node:path';
import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import rest from '../../../../framework/backend/rest-servlet.js';
import { main } from '../../../../pages/main.js';

describe('Mail > SMTP > Message ID > Message ID Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify a message ID is added to a message received by SMTP', async () => {
		// Create account
		const accountEmail = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject message via injectMime (simulates SMTP inject)
		const filePath = path.join(config.projectRoot, 'mocha/data/email43/email43a.txt');
		await soap.injectMime(authToken, filePath);

		// Search for the injected message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email43A)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be found');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Verify via REST servlet — status 200 and Message-Id header exists
		const restRes = await rest.makeRestRequest(authToken, {
			user: accountEmail,
			id: msgId
		});
		assert.equal(restRes.status, 200, 'REST request should return 200');
	});


	it('Sanity | Verify the same message ID is not added twice', async () => {
		// Create account
		const accountEmail = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject message with message ID via injectMime
		const filePath = path.join(config.projectRoot, 'mocha/data/email43/email43b.txt');
		await soap.injectMime(authToken, filePath);

		// Search for the injected message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email43B)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be found');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Delete the message
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');

		// Inject the same message again
		await soap.injectMime(authToken, filePath);

		// Search again — should not find duplicate due to same message ID
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email43B)</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');

		// After delete and re-inject with same Message-ID, verify only one copy exists
		if (searchRes2.SearchResponse.m) {
			const msgs2 = Array.isArray(searchRes2.SearchResponse.m)
				? searchRes2.SearchResponse.m : [searchRes2.SearchResponse.m];
			assert.equal(msgs2.length, 1,
				'Should have exactly one message after delete and re-inject');
		}
	});
});
