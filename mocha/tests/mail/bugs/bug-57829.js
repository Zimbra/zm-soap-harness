import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 57829', function () {
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
	it('Sanity | Verify users default charset is used when re-indexing', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = (Array.isArray(createRes.CreateAccountResponse.account) ? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account).id;
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add a message with Japanese content
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: test@test.com
Subject: =?ISO-2022-JP?B?GyRCRnxLXDhsJWEbKEI=?=
MIME-Version: 1.0
Content-Type: text/plain; charset="iso-2022-jp"
Content-Transfer-Encoding: base64
GyRCRnxLXDhsJWEhPCVrJHJBdyRqJF4kORsoQg==
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>To: test@test.com</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');

		// Modify account to set default charset to ISO-2022-JP
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraPrefMailDefaultCharset">ISO-2022-JP</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccountRequest should not fault');

		// Trigger reindex
		const reindexRes = await soap.makeSOAPEnvelopeAdmin(
			`<ReIndexRequest xmlns="urn:zimbraAdmin" action="start">
				<mbox id="${accountId}"/>
			</ReIndexRequest>`, adminAuthToken
		);
		assert.notExists(reindexRes.Fault, 'ReIndexRequest should not fault');
		assert.equal(reindexRes.ReIndexResponse.status, 'started', 'ReIndex should have started');

		// Poll for reindex completion
		let reindexComplete = false;
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 2000));
			const statusRes = await soap.makeSOAPEnvelopeAdmin(
				`<ReIndexRequest xmlns="urn:zimbraAdmin" action="status">
					<mbox id="${accountId}"/>
				</ReIndexRequest>`, adminAuthToken
			);
			if (statusRes.ReIndexResponse && statusRes.ReIndexResponse.status === 'idle') {
				reindexComplete = true;
				break;
			}
		}
		assert.isTrue(reindexComplete, 'ReIndex should complete');

		// Verify search still returns the message with correct Japanese subject after reindex
		const authToken2 = await soap.getAccountAuthToken(accountEmail);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>To: test@test.com</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest after reindex should not fault');
		assert.exists(searchRes2.SearchResponse.m, 'Should find message after reindex');

		const msgs = Array.isArray(searchRes2.SearchResponse.m)
			? searchRes2.SearchResponse.m : [searchRes2.SearchResponse.m];
		const msg = msgs[0];
		assert.include(msg.su, '日本語メ', 'Subject should contain Japanese characters after reindex');
	});
});
