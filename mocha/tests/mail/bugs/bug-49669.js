import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 49669', function () {
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
	it('Sanity | Emails which should have been part of one conversation are divided into two coversations', async () => {
		// Create two accounts
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
		const authToken1 = await soap.getAccountAuthToken(account1Email);
		const authToken2 = await soap.getAccountAuthToken(account2Email);

		// Send initial message from account1 to account2
		const subject = `accountpassword`;
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Original message content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');

		// Reply to message (Re: subject)
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Reply content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes2.Fault, 'SendMsgRequest reply should not fault');

		// Send another reply
		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Second reply content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes3.Fault, 'SendMsgRequest reply 2 should not fault');

		// Search for conversation in account2

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.c, 'Should find conversations');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		const convId = conv.id;

		// Verify the conversation subject matches
		assert.include(conv.su, subject, 'Conversation subject should contain the original subject');

		// Get conversation and verify all 3 messages are in one conversation
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, authToken2
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const getConv = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		assert.equal(
			getConv.n, '3',
			'Conversation should have 3 messages'
		);
	});
});
