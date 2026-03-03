import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > On Behalf Of > Send Msg Request On Behalf Of Basic', function () {
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
	it('Smoke | Account1 sends a message On-Behalf-Of Account2 to Account3', async () => {
		// Create test accounts
		const account1Email = `onbehalf1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `onbehalf2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `onbehalf3.${common.getUniqueString()}@${testDomain}`;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(create1Res.CreateAccountResponse.account)
			? create1Res.CreateAccountResponse.account[0].id
			: create1Res.CreateAccountResponse.account.id;

		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'CreateAccountRequest should not fault');
		const account2Id = Array.isArray(create2Res.CreateAccountResponse.account)
			? create2Res.CreateAccountResponse.account[0].id
			: create2Res.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOf right to account1 on account2
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendOnBehalfOf</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send message on behalf of account2 to account3
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken, true, account2Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Login as account3 and verify receipt (allow delivery time)
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		let searchRes;
			await new Promise(r => setTimeout(r, 5000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
			);

		// Verify message received
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist in search results');
	});


	it('Sanity | Verify mime content (REST) for on-behalf-of messages', async () => {
		// Create test accounts
		const account1Email = `onbehalf1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `onbehalf2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `onbehalf3.${common.getUniqueString()}@${testDomain}`;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'CreateAccountRequest should not fault');

		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'CreateAccountRequest should not fault');
		const account2Id = Array.isArray(create2Res.CreateAccountResponse.account)
			? create2Res.CreateAccountResponse.account[0].id
			: create2Res.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOf right
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendOnBehalfOf</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send message on behalf of account2 to account3
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<e t="f" a="${account2Email}"/>
					<e t="s" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken, true, account2Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Login as account3 and search for the message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		// Verify message received (may take time for on-behalf-of delivery)
		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 2000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
			);
		}
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message details to verify From and Sender
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify message headers
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		const senderAddr = emailAddrs.find(e => e.t === 's');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		assert.exists(senderAddr, 'Sender address should exist');
		assert.equal(senderAddr.a, account1Email, 'Sender should be account1');
	});


	it('Sanity | Verify GetMsgRequest for on-behalf-of messages', async () => {
		// Create test accounts
		const account1Email = `onbehalf1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `onbehalf2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `onbehalf3.${common.getUniqueString()}@${testDomain}`;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'CreateAccountRequest should not fault');

		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'CreateAccountRequest should not fault');
		const account2Id = Array.isArray(create2Res.CreateAccountResponse.account)
			? create2Res.CreateAccountResponse.account[0].id
			: create2Res.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOf right
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account2Email}</target>
				<grantee by="name" type="usr">${account1Email}</grantee>
				<right>sendOnBehalfOf</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account1
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Send message on behalf of account2 to account3
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Email}"/>
					<e t="f" a="${account2Email}"/>
					<e t="s" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken, true, account2Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Login as account3 and search
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 5000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account3AuthToken
			);
		}

		// Verify message found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist in search results');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// GetMsgRequest and verify headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify From and Sender in GetMsgResponse
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		const senderAddr = emailAddrs.find(e => e.t === 's');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		assert.exists(senderAddr, 'Sender address should exist');
		assert.equal(senderAddr.a, account1Email, 'Sender should be account1');
	});
});
