import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Persona > Send As Mail Using Primary Account', function () {
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
	it('Sanity | Verify user is able to send an email with sendAs right 1', async () => {
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendAs right to account1 on account2
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendAs</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Verify right using DiscoverRightsRequest
		const discoverRes = await soap.makeSOAPEnvelopeAccount(
			`<DiscoverRightsRequest xmlns="urn:zimbraAccount">
				<right>sendAs</right>
			</DiscoverRightsRequest>`, account1AuthToken
		);
		assert.notExists(discoverRes.Fault, 'DiscoverRightsRequest should not fault');
		assert.exists(discoverRes.DiscoverRightsResponse, 'DiscoverRightsResponse should exist');

		// Send email with From set to account2
		const subject = `test mail ${common.getUniqueString()}`;
		const content = `content of the message ${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account2Email}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Verify message details using GetMsgRequest
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');

		// Verify recipient received the message (allow delivery time)
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		let searchRes;
			await new Promise(r => setTimeout(r, 3000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:(${account2Email})</query>
			</SearchRequest>`, account3AuthToken
			);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
	});


	it('Sanity | Verify user is able to send an email with sendAs right 2', async () => {
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendAs right
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendAs</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Modify default identity to use account2 as from address
		const identRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, account1AuthToken
		);
		assert.notExists(identRes.Fault, 'GetIdentitiesRequest should not fault');

		const modIdentRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="DEFAULT">
					<a name="zimbraPrefFromAddress">${account2Email}</a>
				</identity>
			</ModifyIdentityRequest>`, account1AuthToken
		);
		assert.notExists(modIdentRes.Fault, 'ModifyIdentityRequest should not fault');

		// Send email with persona/From set to account2
		const subject = `test mail from persona ${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="f" a="${account2Email}" p="DEFAULT"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const msgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Verify message details
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		assert.equal(fromAddr.p, 'DEFAULT', 'From persona should be DEFAULT');

		// Verify recipient received the message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 2000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>from:(${account2Email})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
	});
});
