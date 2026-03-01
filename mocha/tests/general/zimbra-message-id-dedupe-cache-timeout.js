import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Zimbra Message Id Dedupe Cache Timeout', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;

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
	it('Sanity | Messages with same message id get injected after zimbraMessageIdDedupeCacheTimeout', async () => {
		// ModifyConfigRequest
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraMessageIdDedupeCacheTimeout">60s</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyConfigRequest should not fault');
		const accountEmail = `account1${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const msgId = `&lt;${common.getUniqueString()}@test.zimbra.com&gt;`;

		// Inject the message
		const addRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>From: sender@test.com
To: ${accountEmail}
Subject: test1
Message-ID: ${msgId}

First message content
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes1.Fault, 'First AddMsgRequest should not fault: ' + JSON.stringify(addRes1.Fault));

		// Inject the message
		const addRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>From: sender@test.com
To: ${accountEmail}
Subject: test3
Message-ID: &lt;${common.getUniqueString()}@test.zimbra.com&gt;

Third message content
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes3.Fault, 'Third AddMsgRequest should not fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject: test*</query>
			</SearchRequest>`, authToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse,
			'SearchResponse should exist');

		// Send modify config request
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraMessageIdDedupeCacheTimeout"></a>
				<a n="zimbraMessageIdDedupeCacheSize"></a>
			</ModifyConfigRequest>`, adminAuthToken
		);
	});


	it('Sanity | Verify zimbraMessageIdDedupeCacheTimeout has precedence over zimbraMessageIdDedupeCacheSize', async () => {
		// ModifyConfigRequest
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraMessageIdDedupeCacheTimeout">50s</a>
				<a n="zimbraMessageIdDedupeCacheSize">0</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyConfigRequest should not fault');
		const accountEmail = `account3${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const msgId = `&lt;${common.getUniqueString()}@test.zimbra.com&gt;`;

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>From: sender@test.com
To: ${accountEmail}
Subject: test1
Message-ID: ${msgId}

First message content
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>From: sender@test.com
To: ${accountEmail}
Subject: test4
Message-ID: &lt;${common.getUniqueString()}@test.zimbra.com&gt;

Fourth message content
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject: test*</query>
			</SearchRequest>`, authToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse,
			'SearchResponse should exist');

		// Send modify config request
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraMessageIdDedupeCacheTimeout"></a>
				<a n="zimbraMessageIdDedupeCacheSize"></a>
			</ModifyConfigRequest>`, adminAuthToken
		);
	});
});
