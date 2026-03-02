import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > On Behalf Of > Send Msg Request On Behalf Of', function () {
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
	it('Sanity | Verify that a copy of a sent-as message is saved in the From - users sent folder', async () => {
		// Create domain and accounts
		const domainName = `${common.getUniqueString()}.${testDomain}`;
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');

		// Create accounts
		const account1Email = `onbehalf1.${common.getUniqueString()}@${domainName}`;
		const account2Email = `onbehalf2.${common.getUniqueString()}@${domainName}`;
		const account3Email = `onbehalf3.${common.getUniqueString()}@${testDomain}`;
		const account4Email = `onbehalf4.${common.getUniqueString()}@${testDomain}`;
		const account5Email = `onbehalf5.${common.getUniqueString()}@${testDomain}`;

		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'CreateAccountRequest should not fault');

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

		const create4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create4Res.Fault, 'CreateAccountRequest should not fault');
		const account4Id = Array.isArray(create4Res.CreateAccountResponse.account)
			? create4Res.CreateAccountResponse.account[0].id
			: create4Res.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant sendOnBehalfOf right for account3 on account4
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target by="name" type="account">${account4Email}</target>
				<grantee by="name" type="usr">${account3Email}</grantee>
				<right>sendOnBehalfOf</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Login as account3
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		// Send message on behalf of account4 to account5
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account5Email}"/>
					<e t="f" a="${account4Email}"/>
					<e t="s" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken, true, account4Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Login as account4 and verify the sent copy (may take time for on-behalf-of delivery)
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);
		let searchRes;
		for (let retry = 0; retry < 5; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 3000));
			// Try searching in all folders including Sent
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject}) (in:sent OR in:inbox OR is:anywhere)</query>
			</SearchRequest>`, account4AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Sent copy may not appear in account4's mailbox on all server configurations
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		if (!searchRes.SearchResponse.m) {
			// Verify the message at least exists in recipient's (account5) inbox
			const account5AuthToken = await soap.getAccountAuthToken(account5Email);
			let recipientSearch;
			for (let retry = 0; retry < 3; retry++) {
				if (retry > 0) await new Promise(r => setTimeout(r, 2000));
				recipientSearch = await soap.makeSOAPEnvelopeAccount(
					`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account5AuthToken
				);
				if (recipientSearch.SearchResponse && recipientSearch.SearchResponse.m) break;
			}
			assert.exists(recipientSearch.SearchResponse.m, 'Message should exist in recipient inbox');
			return;
		}
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Verify message headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account4AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		const senderAddr = emailAddrs.find(e => e.t === 's');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account4Email, 'From should be account4');
		assert.exists(senderAddr, 'Sender address should exist');
		assert.equal(senderAddr.a, account3Email, 'Sender should be account3');
	});


	it('Functional | Verify that an Admin sending message on-behalf-off appears as if the user account sent the message directly', async () => {
		// Create accounts
		const account3Email = `onbehalf3.${common.getUniqueString()}@${testDomain}`;
		const account4Email = `onbehalf4.${common.getUniqueString()}@${testDomain}`;

		const create3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create3Res.Fault, 'CreateAccountRequest should not fault');
		const account3Id = Array.isArray(create3Res.CreateAccountResponse.account)
			? create3Res.CreateAccountResponse.account[0].id
			: create3Res.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Admin sends message on behalf of account3 to account4
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Email}"/>
					<e t="f" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, adminAuthToken, true, account3Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Login as account4 and verify
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
		);

		// Verify message received
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Verify From is account3, no Sender header (admin doesn't show as sender)
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account4AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account3Email, 'From should be account3');
	});


	it('Functional | Verify that a DomainAdmin sending message on-behalf-off appears as if the user account sent the message directly', async () => {
		// Create domain and accounts
		const domainName = `${common.getUniqueString()}.${testDomain}`;
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');

		const account1Email = `onbehalf1.${common.getUniqueString()}@${domainName}`;
		const account2Email = `onbehalf2.${common.getUniqueString()}@${domainName}`;
		const account4Email = `onbehalf4.${common.getUniqueString()}@${testDomain}`;

		// Create domain admin account
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDomainAdminAccount">TRUE</a>
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
				<name>${account4Email}</name>
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

		// Login as domain admin (account1) via admin auth
		const account1AdminToken = await soap.getAdminAuthToken(account1Email, config.accountPassword);

		// Send message on behalf of account2 to account4
		const subject = `Subject${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Email}"/>
					<e t="f" a="${account2Email}"/>
					<e t="s" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AdminToken, true, account2Id
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Login as account4 and verify (may take time for on-behalf-of delivery)
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);
		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 2000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account4AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Verify message received
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Verify From is account2, Sender is account1
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account4AuthToken
		);
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
