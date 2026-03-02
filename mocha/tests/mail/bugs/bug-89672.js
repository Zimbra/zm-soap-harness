import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 89672', function () {
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
	it('Sanity | Envelope from address does not change when sending mail using persona', async () => {
		// Create accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const aliasEmail = `alias${common.getUniqueString()}@${testDomain}`;
		const subject = 'test account alias';

		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Add alias to account1
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Set zimbraSmtpRestrictEnvelopeFrom to FALSE
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraSmtpRestrictEnvelopeFrom">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Get account auth token and send message from alias
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const content = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${aliasEmail}"/>
					<e t="t" a="${account2Email}"/>
					<su> ${subject}</su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		const messageId = sentMsg.id;

		// Login as account2 and verify from address is alias
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, account2AuthToken
		);

		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const fromAddr = Array.isArray(msg.e)
			? msg.e.find(e => e.t === 'f') : (msg.e && msg.e.t === 'f' ? msg.e : null);
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, aliasEmail, 'From address should be the alias');
	});
});
