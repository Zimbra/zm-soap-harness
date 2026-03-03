import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Persona > Send As Mail Using Persona From Nonexisting Mail ID', function () {
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
	it('Sanity | Verify message will not vanish from the Drafts folder at the scheduled Send Later', async () => {
		// Create test accounts
		const account1Email = `test1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test3.${common.getUniqueString()}@${testDomain}`;
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

		// Get account1 ID for ModifyAccountRequest (to set zimbraAllowFromAddress)

		// Get account1 ID for ModifyAccountRequest
		const getAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${account1Email}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getAcctRes.Fault, 'GetAccountRequest should not fault');
		const acct = Array.isArray(getAcctRes.GetAccountResponse.account)
			? getAcctRes.GetAccountResponse.account[0] : getAcctRes.GetAccountResponse.account;
		const account1Id = acct.id;

		// Set zimbraAllowFromAddress
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraAllowFromAddress">${account3Email}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccountRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Create persona with non-existing account3 as from address
		const personaName = `New Persona 1`;
		const createIdentRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${personaName}">
					<a name="zimbraPrefIdentityName">${personaName}</a>
					<a name="zimbraPrefFromDisplay">${account3Email}</a>
					<a name="zimbraPrefFromAddress">${account3Email}</a>
					<a name="zimbraPrefFromAddressType">sendAs</a>
				</identity>
			</CreateIdentityRequest>`, account1AuthToken
		);
		assert.notExists(createIdentRes.Fault, 'CreateIdentityRequest should not fault');

		// Save as draft with autoSendTime
		const subject = `test mail from persona ${common.getUniqueString()}`;
		const content = `content of the message ${common.getUniqueString()}`;
		const autoSendTime = Math.floor(Date.now() / 1000) + 60;
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<autoSendTime>${autoSendTime}</autoSendTime>
					<su>${subject}</su>
					<e t="t" a="${account2Email}"/>
					<e t="f" a="${account3Email}"/>
					<e t="r" a="${account3Email}"/>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');

		// Wait for auto-send to process
		await new Promise(resolve => setTimeout(resolve, 80000));

		// Verify message was received by account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Verify message details
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account3Email, 'From should be account3');

		// Verify draft is no longer in Drafts folder
		const draftSearchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Drafts</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(draftSearchRes.Fault, 'SearchRequest should not fault');
		assert.notExists(draftSearchRes.SearchResponse.m, 'Drafts folder should be empty');
	});
});
