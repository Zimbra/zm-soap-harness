import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Bounce Msg Request Basic', function () {
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
	it('Smoke | Send bounce message from sender to third user', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and send a message to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Bounce the message to account3
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}">
					<e t="t" a="${account3Email}"/>
				</m>
			</BounceMsgRequest>`, account1AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Login as account3 and search for bounced message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify bounced message found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m
			: searchRes.SearchResponse.c
				? (Array.isArray(searchRes.SearchResponse.c) ? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
				: [searchRes.SearchResponse.m];
		assert.isAtLeast(msgs.length, 1, 'Should find at least one message');
		const firstMsg = msgs[0];
		const msgId = firstMsg.m ? (Array.isArray(firstMsg.m) ? firstMsg.m[0].id : firstMsg.m.id) : firstMsg.id;

		// Get the full message and verify headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify message headers
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddresses = Array.isArray(msg.e) ? msg.e : [msg.e];
		const toAddr = emailAddresses.find(e => e.t === 't');
		const fromAddr = emailAddresses.find(e => e.t === 'f');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account1Email, 'From address should match sender');
	});


	it('Sanity | Send bounce message from one recipient to third user', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and send a message to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Login as account2 and search for message
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		let search2Res;
		for (let retry = 0; retry < 3; retry++) {
			await new Promise(resolve => setTimeout(resolve, 5000));
			search2Res = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
			if (search2Res.SearchResponse && search2Res.SearchResponse.m) break;
		}

		// Get account2's message ID
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		assert.exists(search2Res.SearchResponse.m, 'Message should exist in account2');
		const msgs2 = Array.isArray(search2Res.SearchResponse.m)
			? search2Res.SearchResponse.m : [search2Res.SearchResponse.m];
		const firstMsg2 = msgs2[0];
		const msg2Id = firstMsg2.id;

		// Bounce from account2 to account3
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg2Id}">
					<e t="t" a="${account3Email}"/>
				</m>
			</BounceMsgRequest>`, account2AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Login as account3 and verify message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify bounced message found in account3
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
		assert.exists(search3Res.SearchResponse, 'SearchResponse should exist');
		const msgs3 = search3Res.SearchResponse.c
			? (Array.isArray(search3Res.SearchResponse.c) ? search3Res.SearchResponse.c : [search3Res.SearchResponse.c])
			: (Array.isArray(search3Res.SearchResponse.m) ? search3Res.SearchResponse.m : [search3Res.SearchResponse.m]);
		const firstMsg3 = msgs3[0];
		const msg3Id = firstMsg3.m ? (Array.isArray(firstMsg3.m) ? firstMsg3.m[0].id : firstMsg3.m.id) : firstMsg3.id;

		// Get message and verify headers show account2 as resent-from
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg3Id}"/>
			</GetMsgRequest>`, account3AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddresses = Array.isArray(msg.e) ? msg.e : [msg.e];
		const toAddr = emailAddresses.find(e => e.t === 't');
		const fromAddr = emailAddresses.find(e => e.t === 'f');
		const rfAddr = emailAddresses.find(e => e.t === 'rf');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account1Email, 'From address should match original sender');
		assert.exists(rfAddr, 'Resent-From address should exist');
		assert.equal(rfAddr.a, account2Email, 'Resent-From should match bouncer');
	});


	it('Sanity | Send bounce message to self', async () => {
		// Create test accounts
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

		// Login as account1 and send a message to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Bounce message to self
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}">
					<e t="t" a="${account1Email}"/>
				</m>
			</BounceMsgRequest>`, account1AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Search for bounced message in inbox

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:(${subject})</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify bounced message received
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = searchRes.SearchResponse.c
			? (Array.isArray(searchRes.SearchResponse.c) ? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
			: (Array.isArray(searchRes.SearchResponse.m) ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m]);
		const firstMsg = msgs[0];
		const msgId = firstMsg.m ? (Array.isArray(firstMsg.m) ? firstMsg.m[0].id : firstMsg.m.id) : firstMsg.id;

		// Get message and verify headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddresses = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddresses.find(e => e.t === 'f');
		const rfAddr = emailAddresses.find(e => e.t === 'rf');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account1Email, 'From address should match sender');
		assert.exists(rfAddr, 'Resent-From address should exist');
		assert.equal(rfAddr.a, account1Email, 'Resent-From should match sender (self-bounce)');
	});


	it('Sanity | Send bounce message to recipient again from sender', async () => {
		// Create test accounts
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

		// Login as account1 and send a message to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Bounce the message back to account2
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}">
					<e t="t" a="${account2Email}"/>
				</m>
			</BounceMsgRequest>`, account1AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Login as account2 and search for messages sorted by date
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify bounced message found in account2
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = searchRes.SearchResponse.c
			? (Array.isArray(searchRes.SearchResponse.c) ? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
			: (Array.isArray(searchRes.SearchResponse.m) ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m]);
		const firstMsg = msgs[0];
		const msgId = firstMsg.m ? (Array.isArray(firstMsg.m) ? firstMsg.m[0].id : firstMsg.m.id) : firstMsg.id;

		// Get message and verify headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddresses = Array.isArray(msg.e) ? msg.e : [msg.e];
		const toAddr = emailAddresses.find(e => e.t === 't');
		const fromAddr = emailAddresses.find(e => e.t === 'f');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account2Email, 'To address should match recipient');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account1Email, 'From address should match sender');
	});


	it('Sanity | Send bounce message Add cc bcc etc', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account4Email = `test${common.getUniqueString()}@${testDomain}`;
		const account5Email = `test${common.getUniqueString()}@${testDomain}`;
		const account6Email = `test${common.getUniqueString()}@${testDomain}`;
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
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account1 and send a message to account2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		// Bounce with from, sender, to, cc, bcc
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}">
					<e t="f" a="${account1Email}"/>
					<e t="s" a="${account2Email}"/>
					<e t="t" a="${account4Email}"/>
					<e t="c" a="${account5Email}"/>
					<e t="b" a="${account6Email}"/>
				</m>
			</BounceMsgRequest>`, account1AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Verify account4 (To) received the message
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search4Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
		);
		assert.notExists(search4Res.Fault, 'SearchRequest should not fault');
		assert.exists(search4Res.SearchResponse, 'SearchResponse should exist');

		// Verify account5 (CC) received the message
		const account5AuthToken = await soap.getAccountAuthToken(account5Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search5Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account5AuthToken
		);
		assert.notExists(search5Res.Fault, 'SearchRequest should not fault');
		assert.exists(search5Res.SearchResponse, 'SearchResponse should exist');

		// Verify account6 (BCC) received the message
		const account6AuthToken = await soap.getAccountAuthToken(account6Email);
		const search6Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account6AuthToken
		);
		assert.notExists(search6Res.Fault, 'SearchRequest should not fault');
		assert.exists(search6Res.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Send bounce message with attachment', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and send message with attachment via SOAP
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub1${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain">
							<content>Hello with attachment</content>
						</mp>
						<mp ct="text/plain" filename="test.txt">
							<content>This is test attachment content</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for the message

		await new Promise(resolve => setTimeout(resolve, 5000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = searchRes.SearchResponse.c
			? (Array.isArray(searchRes.SearchResponse.c) ? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
			: (Array.isArray(searchRes.SearchResponse.m) ? searchRes.SearchResponse.m : [searchRes.SearchResponse.m]);
		const firstMsg = msgs[0];
		const msgId = firstMsg.m ? (Array.isArray(firstMsg.m) ? firstMsg.m[0].id : firstMsg.m.id) : firstMsg.id;

		// Bounce message to account3
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}">
					<e t="t" a="${account3Email}"/>
				</m>
			</BounceMsgRequest>`, account1AuthToken
		);

		// Verify bounce succeeded
		assert.notExists(bounceRes.Fault, 'BounceMsgRequest should not fault');
		assert.exists(bounceRes.BounceMsgResponse, 'BounceMsgResponse should exist');

		// Login as account3 and verify bounced message
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search3Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(search3Res.Fault, 'SearchRequest should not fault');
		assert.exists(search3Res.SearchResponse, 'SearchResponse should exist');
	});
});
