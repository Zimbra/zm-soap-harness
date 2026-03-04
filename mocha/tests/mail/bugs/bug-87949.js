import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 87949', function () {
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
	it('Sanity | Search conversation with in:sent -to filter returns no self-sent mails', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
		const authToken = await soap.getAccountAuthToken(accountEmail);

		const subject = `Subject${common.getUniqueString()}`;
		const content = `content of the message${common.getUniqueString()}`;

		// Send 5 mails to self
		const send1Res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(send1Res.Fault, 'SendMsgRequest should not fault');
		let messageId = (Array.isArray(send1Res.SendMsgResponse.m) ? send1Res.SendMsgResponse.m[0] : send1Res.SendMsgResponse.m).id;

		for (let i = 0; i < 4; i++) {
			const fwdRes = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m origid="${messageId}" rt="w">
						<e t="t" a="${accountEmail}"/>
						<su>Fwd: ${subject}</su>
						<mp ct="text/plain">
							<content>Forwarded content: ${content}</content>
						</mp>
					</m>
				</SendMsgRequest>`, authToken
			);
			assert.notExists(fwdRes.Fault, `SendMsgRequest forward ${i + 1} should not fault`);
			messageId = (Array.isArray(fwdRes.SendMsgResponse.m) ? fwdRes.SendMsgResponse.m[0] : fwdRes.SendMsgResponse.m).id;
		}

		// Search with in:sent -to:account filter
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent -to:${accountEmail})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		// Should return no results since all mails were sent to self
		const messages = searchRes.SearchResponse.m;
		assert.isTrue(
			messages === undefined || messages === null || (Array.isArray(messages) && messages.length === 0),
			'Search should return no messages when filtering out self-sent mails'
		);
	});
});
