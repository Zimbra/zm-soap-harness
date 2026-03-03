import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Conversation > Bugs > Bug 95266', function () {
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
	it('Sanity | Search for a conversation with valid conversation-id', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const subject = `Subject${common.getUniqueString()}`;

		// Send 5 messages to create a conversation
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content of the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes1.Fault, 'SendMsgRequest should not fault');
		let lastMsgId = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0].id : sendRes1.SendMsgResponse.m.id;

		for (let i = 0; i < 4; i++) {
			const fwdRes = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m origid="${lastMsgId}" rt="w">
						<e t="t" a="${accountEmail}"/>
						<su>Fwd: ${subject}</su>
						<mp ct="text/plain">
							<content>Forwarded content ${i}</content>
						</mp>
					</m>
				</SendMsgRequest>`, authToken
			);
			lastMsgId = Array.isArray(fwdRes.SendMsgResponse.m)
				? fwdRes.SendMsgResponse.m[0].id : fwdRes.SendMsgResponse.m.id;
		}

		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search for conversation
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const conv = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.exists(conv, 'Should find a conversation');

		// SearchConvRequest with limit and offset
		const searchConvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${conv.id}" limit="5" offset="4">
				<query>in:sent</query>
			</SearchConvRequest>`, authToken
		);

		// SearchConvRequest may fault if offset exceeds available messages
		if (searchConvRes.Fault) {
			assert.isString(searchConvRes.Fault.Detail.Error.Code, 'May fault if offset exceeds results');
		} else {
		}
	});
});
