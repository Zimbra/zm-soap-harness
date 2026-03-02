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

		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(convs[0], 'Conversation should exist');
		const cMsgs = Array.isArray(convs[0].m) ? convs[0].m : [convs[0].m];
		const msgId = cMsgs[0].id;
		assert.exists(msgId, 'Message ID should exist');

		// Get the full message and verify headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify message headers
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddresses = Array.isArray(msg.e) ? msg.e : [msg.e];
		const toAddr = emailAddresses.find(e => e.t === 't');
		const fromAddr = emailAddresses.find(e => e.t === 'f');
		const rfAddr = emailAddresses.find(e => e.t === 'rf');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account1Email, 'From address should match sender');
		assert.exists(rfAddr, 'Resent-From address should exist');
		assert.equal(rfAddr.a, account1Email, 'Resent-From should match sender');
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

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Get account2's message ID
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		assert.exists(search2Res.SearchResponse, 'SearchResponse should exist');
		const convs2 = Array.isArray(search2Res.SearchResponse.c)
			? search2Res.SearchResponse.c : [search2Res.SearchResponse.c];
		assert.exists(convs2[0], 'Conversation should exist in account2');
		const msgs2 = Array.isArray(convs2[0].m) ? convs2[0].m : [convs2[0].m];
		const msg2Id = msgs2[0].id;
		assert.exists(msg2Id, 'Message ID should exist');

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
		const convs3 = Array.isArray(search3Res.SearchResponse.c)
			? search3Res.SearchResponse.c : [search3Res.SearchResponse.c];
		assert.exists(convs3[0], 'Conversation should exist in account3');
		const cMsgs3 = Array.isArray(convs3[0].m) ? convs3[0].m : [convs3[0].m];
		const msg3Id = cMsgs3[0].id;
		assert.exists(msg3Id, 'Message ID should exist');

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
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(convs[0], 'Conversation should exist');
		const cMsgs = Array.isArray(convs[0].m) ? convs[0].m : [convs[0].m];
		const msgId = cMsgs[0].id;
		assert.exists(msgId, 'Message ID should exist');

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
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(convs[0], 'Conversation should exist in account2');
		const cMsgs = Array.isArray(convs[0].m) ? convs[0].m : [convs[0].m];
		const msgId = cMsgs[0].id;
		assert.exists(msgId, 'Message ID should exist');

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

		// Verify account4 (To) received the message and check headers
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search4Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
		);
		assert.notExists(search4Res.Fault, 'SearchRequest should not fault');
		assert.exists(search4Res.SearchResponse, 'SearchResponse should exist');
		const convs4 = Array.isArray(search4Res.SearchResponse.c)
			? search4Res.SearchResponse.c : [search4Res.SearchResponse.c];
		assert.exists(convs4[0], 'Conversation should exist in account4');
		const cMsgs4 = Array.isArray(convs4[0].m) ? convs4[0].m : [convs4[0].m];
		const msg4Id = cMsgs4[0].id;
		assert.exists(msg4Id, 'Message ID should exist in account4');

		// Get message and verify headers for account4
		const getMsg4Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg4Id}"/>
			</GetMsgRequest>`, account4AuthToken
		);
		assert.notExists(getMsg4Res.Fault, 'GetMsgRequest should not fault');
		const msg4 = Array.isArray(getMsg4Res.GetMsgResponse.m)
			? getMsg4Res.GetMsgResponse.m[0] : getMsg4Res.GetMsgResponse.m;
		const addrs4 = Array.isArray(msg4.e) ? msg4.e : [msg4.e];
		const toAddr4 = addrs4.find(e => e.t === 't');
		const fromAddr4 = addrs4.find(e => e.t === 'f');
		const rfAddr4 = addrs4.find(e => e.t === 'rf');
		assert.exists(toAddr4, 'To address should exist in account4');
		assert.equal(toAddr4.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr4, 'From address should exist in account4');
		assert.equal(fromAddr4.a, account1Email, 'From address should match sender');
		assert.exists(rfAddr4, 'Resent-From address should exist in account4');
		assert.equal(rfAddr4.a, account1Email, 'Resent-From should match sender');

		// Verify account5 (CC) received the message and check headers
		const account5AuthToken = await soap.getAccountAuthToken(account5Email);

		await new Promise(resolve => setTimeout(resolve, 5000));
		const search5Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account5AuthToken
		);
		assert.notExists(search5Res.Fault, 'SearchRequest should not fault');
		assert.exists(search5Res.SearchResponse, 'SearchResponse should exist');
		const convs5 = Array.isArray(search5Res.SearchResponse.c)
			? search5Res.SearchResponse.c : [search5Res.SearchResponse.c];
		assert.exists(convs5[0], 'Conversation should exist in account5');
		const cMsgs5 = Array.isArray(convs5[0].m) ? convs5[0].m : [convs5[0].m];
		const msg5Id = cMsgs5[0].id;
		assert.exists(msg5Id, 'Message ID should exist in account5');

		// Get message and verify headers for account5
		const getMsg5Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg5Id}"/>
			</GetMsgRequest>`, account5AuthToken
		);
		assert.notExists(getMsg5Res.Fault, 'GetMsgRequest should not fault');
		const msg5 = Array.isArray(getMsg5Res.GetMsgResponse.m)
			? getMsg5Res.GetMsgResponse.m[0] : getMsg5Res.GetMsgResponse.m;
		const addrs5 = Array.isArray(msg5.e) ? msg5.e : [msg5.e];
		const toAddr5 = addrs5.find(e => e.t === 't');
		const fromAddr5 = addrs5.find(e => e.t === 'f');
		const rfAddr5 = addrs5.find(e => e.t === 'rf');
		assert.exists(toAddr5, 'To address should exist in account5');
		assert.equal(toAddr5.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr5, 'From address should exist in account5');
		assert.equal(fromAddr5.a, account1Email, 'From address should match sender');
		assert.exists(rfAddr5, 'Resent-From address should exist in account5');
		assert.equal(rfAddr5.a, account1Email, 'Resent-From should match sender');

		// Verify account6 (BCC) received the message and check headers
		const account6AuthToken = await soap.getAccountAuthToken(account6Email);
		const search6Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account6AuthToken
		);
		assert.notExists(search6Res.Fault, 'SearchRequest should not fault');
		assert.exists(search6Res.SearchResponse, 'SearchResponse should exist');
		const convs6 = Array.isArray(search6Res.SearchResponse.c)
			? search6Res.SearchResponse.c : [search6Res.SearchResponse.c];
		assert.exists(convs6[0], 'Conversation should exist in account6');
		const cMsgs6 = Array.isArray(convs6[0].m) ? convs6[0].m : [convs6[0].m];
		const msg6Id = cMsgs6[0].id;
		assert.exists(msg6Id, 'Message ID should exist in account6');

		// Get message and verify headers for account6
		const getMsg6Res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg6Id}"/>
			</GetMsgRequest>`, account6AuthToken
		);
		assert.notExists(getMsg6Res.Fault, 'GetMsgRequest should not fault');
		const msg6 = Array.isArray(getMsg6Res.GetMsgResponse.m)
			? getMsg6Res.GetMsgResponse.m[0] : getMsg6Res.GetMsgResponse.m;
		const addrs6 = Array.isArray(msg6.e) ? msg6.e : [msg6.e];
		const toAddr6 = addrs6.find(e => e.t === 't');
		const fromAddr6 = addrs6.find(e => e.t === 'f');
		const rfAddr6 = addrs6.find(e => e.t === 'rf');
		assert.exists(toAddr6, 'To address should exist in account6');
		assert.equal(toAddr6.a, account2Email, 'To address should match original recipient');
		assert.exists(fromAddr6, 'From address should exist in account6');
		assert.equal(fromAddr6.a, account1Email, 'From address should match sender');
		assert.exists(rfAddr6, 'Resent-From address should exist in account6');
		assert.equal(rfAddr6.a, account1Email, 'Resent-From should match sender');
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
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const convs = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		assert.exists(convs[0], 'Conversation should exist');
		const cMsgs = Array.isArray(convs[0].m) ? convs[0].m : [convs[0].m];
		const srcMsgId = cMsgs[0].id;
		assert.exists(srcMsgId, 'Message ID should exist');

		// Bounce message to account3
		const bounceRes = await soap.makeSOAPEnvelopeAccount(
			`<BounceMsgRequest xmlns="urn:zimbraMail">
				<m id="${srcMsgId}">
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
		const convs3 = Array.isArray(search3Res.SearchResponse.c)
			? search3Res.SearchResponse.c : [search3Res.SearchResponse.c];
		assert.exists(convs3[0], 'Conversation should exist in account3');
		const cMsgs3 = Array.isArray(convs3[0].m) ? convs3[0].m : [convs3[0].m];
		const msg3Id = cMsgs3[0].id;
		assert.exists(msg3Id, 'Message ID should exist in account3');
	});
});
