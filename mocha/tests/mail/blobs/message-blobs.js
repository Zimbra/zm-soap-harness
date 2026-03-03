import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Blobs > Message Blobs', function () {
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
	it('Smoke | Verify that a message sent to 2 accounts can be viewed by both after one account deletes the message', async () => {
		// Create test accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `account3.${common.getUniqueString()}@${testDomain}`;
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

		// Send a message from account1 to account2 and account3
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Antique store owners in lower Manhattan have one thing in common these days.</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for the message as account2 and delete it
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify message found in account2
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		const msg2Id = msgs2[0].id;

		// Delete the message from account2
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg2Id}" op="delete"/>
			</MsgActionRequest>`, account2AuthToken
		);

		// Verify delete succeeded
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');
		const msgAction = Array.isArray(deleteRes.MsgActionResponse.action)
			? deleteRes.MsgActionResponse.action[0] : deleteRes.MsgActionResponse.action;
		assert.equal(msgAction.op, 'delete', 'op should be delete');

		// Verify account3 can still see the message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify message still exists in account3
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
		const msgs3 = Array.isArray(search3Res.SearchResponse.m)
			? search3Res.SearchResponse.m : [search3Res.SearchResponse.m];
		const msg3Id = msgs3[0].id;

		// Get the full message from account3
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg3Id}" fetch="1" html="1"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify message content is accessible
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Sanity | Verify that a message sent to 3 accounts can be viewed by both after one account deletes the message', async () => {
		// Create test accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `account3.${common.getUniqueString()}@${testDomain}`;
		const account4Email = `account4.${common.getUniqueString()}@${testDomain}`;
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send a message from account1 to account2, account3, and account4
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${account3Email}"/>
					<e t="t" a="${account4Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Antique store owners in lower Manhattan have one thing in common these days.</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for the message as account2 and delete it
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify and delete message from account2
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		const msg2Id = msgs2[0].id;
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg2Id}" op="delete"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');

		// Search and delete message from account3
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
		const msgs3 = Array.isArray(search3Res.SearchResponse.m)
			? search3Res.SearchResponse.m : [search3Res.SearchResponse.m];
		const msg3Id = msgs3[0].id;
		const delete3Res = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg3Id}" op="delete"/>
			</MsgActionRequest>`, account3AuthToken
		);
		assert.notExists(delete3Res.Fault, 'MsgActionRequest should not fault');

		// Verify account4 can still see the message
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search4Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
		);

		// Verify message still exists in account4
		assert.notExists(search4Res.Fault, 'SearchRequest should not fault');
		const msgs4 = Array.isArray(search4Res.SearchResponse.m)
			? search4Res.SearchResponse.m : [search4Res.SearchResponse.m];
		const msg4Id = msgs4[0].id;

		// Get the full message from account4
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg4Id}" fetch="1" html="1"/>
			</GetMsgRequest>`, account4AuthToken
		);

		// Verify message content is accessible
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Sanity | Verify that a message sent to 2 accounts can be viewed by both after one account deletes the message (large file)', async () => {
		// Create test accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `account3.${common.getUniqueString()}@${testDomain}`;
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

		// Send a message from account1 to account2 and account3
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>In this case, we are getting an Rpc exception. If it is an ssl error, or a winhttp connection, invalid url, login failure, or secure failure, we will go into offline mode and put up the error message.</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for the message as account2 and delete it
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify and delete from account2
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		const msg2Id = msgs2[0].id;
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msg2Id}" op="delete"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');

		// Verify account3 can still see the message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify message still exists in account3
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
		const msgs3 = Array.isArray(search3Res.SearchResponse.m)
			? search3Res.SearchResponse.m : [search3Res.SearchResponse.m];
		const msg3Id = msgs3[0].id;

		// Get the full message from account3
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg3Id}" fetch="1" html="1"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify message content is accessible
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});
});
