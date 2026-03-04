import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conv Msg Count', function () {
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
	it('Sanity | Verify that conversation has correct message count after hard delete of some messages from the conversation', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Login as account2 and send a message to account1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;

		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');
		const message1Id = sendRes1.SendMsgResponse.m.id
			? sendRes1.SendMsgResponse.m.id
			: (Array.isArray(sendRes1.SendMsgResponse.m)
				? sendRes1.SendMsgResponse.m[0].id
				: sendRes1.SendMsgResponse.m.id);

		// Forward the same message to create a conversation
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message1Id}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes2.Fault, 'SendMsgRequest forward should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Login as account1 and search for conversation in inbox
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes1.Fault, 'SearchRequest should not fault');
		const conv1 = Array.isArray(searchRes1.SearchResponse.c)
			? searchRes1.SearchResponse.c[0] : searchRes1.SearchResponse.c;
		assert.exists(conv1, 'Should find a conversation');
		assert.equal(Number(conv1.n), 2, 'Conversation should have 2 messages');
		const convId1 = conv1.id;

		// Hard delete the conversation
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId1}" op="delete"/>
			</ConvActionRequest>`, account1AuthToken
		);
		assert.notExists(deleteRes.Fault, 'ConvActionRequest should not fault');
		assert.equal(deleteRes.ConvActionResponse.action.op, 'delete', 'op should be delete');
		assert.equal(deleteRes.ConvActionResponse.action.id, convId1, 'id should match');

		// Verify conversation is deleted from inbox
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
		const convs2 = searchRes2.SearchResponse.c;
		assert.isTrue(!convs2, 'Should not find any conversations in inbox after delete');

		// Login as account2 and forward another message to account1
		const account2AuthToken2 = await soap.getAccountAuthToken(account2Email);

		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message1Id}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content again: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken2
		);
		assert.notExists(sendRes3.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Login as account1 and verify conversation count is 1
		const account1AuthToken2 = await soap.getAccountAuthToken(account1Email);

		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken2
		);
		assert.notExists(searchRes3.Fault, 'SearchRequest should not fault');
		const conv3 = Array.isArray(searchRes3.SearchResponse.c)
			? searchRes3.SearchResponse.c[0] : searchRes3.SearchResponse.c;
		assert.exists(conv3, 'Should find a conversation');
		assert.equal(Number(conv3.n), 1, 'Conversation should have 1 message');
	});
});
