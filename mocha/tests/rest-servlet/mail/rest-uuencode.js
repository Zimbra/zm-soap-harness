import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Mail > Rest Uuencode', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;
	let msg01Content, msg02Content;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		msg01Content = 'Western Digital WD800JB 80GB 8MB Buffer';
		msg02Content = 'Lucky Craft PT65-803BRT Pointer';

		account1Email = 'uuencode' + common.getUniqueString() + '@' + config.testDomain;
		account2Email = 'uuencode' + common.getUniqueString() + '@' + config.testDomain;

		for (const email of [account1Email, account2Email]) {

			// Create account
			const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
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
		}

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Add uuencoded message to account1 via AddMsgRequest (substitute for LMTP inject)
		const addMsg1Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: external@test.com\r\nTo: ${account1Email}\r\nSubject: uuencode01\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="uubound01"\r\n\r\n--uubound01\r\nContent-Type: text/plain\r\n\r\n${msg01Content}\r\n--uubound01\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="test.dat"\r\n\r\nuuencoded content placeholder\r\n--uubound01--\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addMsg1Res.Fault, 'Response should not be a Fault');

		// Add uuencoded message to account2
		const addMsg2Res = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: external@test.com\r\nTo: ${account2Email}\r\nSubject: uuencode02\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="uubound02"\r\n\r\n--uubound02\r\nContent-Type: text/plain\r\n\r\n${msg02Content}\r\n--uubound02\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="test2.dat"\r\n\r\nuuencoded content placeholder 2\r\n--uubound02--\r\n</content>
				</m>
			</AddMsgRequest>`, account2Token
		);

		// Verify response
		assert.notExists(addMsg2Res.Fault, 'Response should not be a Fault');
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
	it('Regression | Verify that a search for content in uuencoded message is successful', async () => {
		// Search in inbox to get message ID
		const inboxRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(inboxRes.Fault, 'Response should not be a Fault');
		const msgs = inboxRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);

		// Verify response
		assert.isAtLeast(msgArr.length, 1, 'Should find at least one message');
		const msg01Id = msgArr[0].id;

		// Search for content
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:(${msg01Content})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const searchMsgs = searchRes.SearchResponse?.m;
		const searchArr = Array.isArray(searchMsgs) ? searchMsgs : (searchMsgs ? [searchMsgs] : []);

		// Verify response
		assert.isAtLeast(searchArr.length, 1, 'Should find message by content search');
		assert.equal(searchArr[0].id, msg01Id, 'Found message ID should match');
	});


	it('Regression | Inject a mime message with a uuencoded attachment using LMTP', async () => {
		// Search in inbox to get message ID
		const inboxRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(inboxRes.Fault, 'Response should not be a Fault');
		const msgs = inboxRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);

		// Verify response
		assert.isAtLeast(msgArr.length, 1, 'Should find at least one message');
		const msg02Id = msgArr[0].id;

		// Search for content
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>content:(${msg02Content})</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const searchMsgs = searchRes.SearchResponse?.m;
		const searchArr = Array.isArray(searchMsgs) ? searchMsgs : (searchMsgs ? [searchMsgs] : []);

		// Verify response
		assert.isAtLeast(searchArr.length, 1, 'Should find message by content search');
		assert.equal(searchArr[0].id, msg02Id, 'Found message ID should match');
	});
});
