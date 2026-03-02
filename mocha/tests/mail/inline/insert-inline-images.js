import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Inline > Insert Inline Images', function () {
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
	it('Smoke | Verify that inline message can be sent', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get auth token for account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with inline content from account1 to account2
		const subject = `TestInline${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="f" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Text before image. Text after image.</content>
						</mp>
						<mp ct="text/html">
							<content>&lt;html&gt;&lt;body&gt;&lt;p&gt;Text before image. Text after image.&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Search for the message as account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" sortBy="dateDesc" offset="0" limit="10" types="message" fetch="1">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Verify the message was found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Should find message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the full message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1" html="1"/>
			</GetMsgRequest>`, account2AuthToken
		);

		// Verify message structure
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		assert.exists(getMsgRes.GetMsgResponse.m, 'Message should exist in response');
	});


	it('Sanity | Verify that a message with multiple inline images can be sent', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get auth token for account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with multiple inline content from account1 to account2
		const subject = `TestMultiInline${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="f" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Text before image. Text after image.</content>
						</mp>
						<mp ct="text/html">
							<content>&lt;html&gt;&lt;body&gt;&lt;p&gt;Text before image. Text after image.&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Search for the message as account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" sortBy="dateDesc" offset="0" limit="10" types="message" fetch="1">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Verify the message was found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Should find message');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get the full message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1" html="1"/>
			</GetMsgRequest>`, account2AuthToken
		);

		// Verify message structure
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		assert.exists(getMsgRes.GetMsgResponse.m, 'Message should exist in response');
	});
});
