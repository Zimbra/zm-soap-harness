import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Hard Delete', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Hard delete a message (dumpster disabled)', async () => {
		// Create the account
		const email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(email);

		// Add a message to inbox
		const subject = `Subject${common.getUniqueString()}`;
		const uid = common.getUniqueString();
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${email}
Message-ID: &lt;${uid}@example.com&gt;
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Test content for ${subject}
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		const msgId = msg.id;

		// Hard delete using op=delete
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</ItemActionRequest>`, authToken
		);
		assert.notExists(deleteRes.Fault, 'Delete should not fault');
		const action = Array.isArray(deleteRes.ItemActionResponse.action)
			? deleteRes.ItemActionResponse.action[0]
			: deleteRes.ItemActionResponse.action;
		assert.equal(action.op, 'delete', 'Op should be delete');
		assert.equal(action.id, msgId, 'Action id should match message id');

		// Verify message is gone
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${subject}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.notExists(searchRes.SearchResponse.m,
			'Message should not be found after hard delete');
	});
});
