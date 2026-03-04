import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Mail > Message Send', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token;
	let account3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account2Token = await soap.getAccountAuthToken(account2Email);

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
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
	it('Smoke | Send a message and auto-add the contact (Last name only) - verify the contact is created', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;

		// Enable auto-add
		const prefRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref xmlns="" name="zimbraPrefAutoAddAddressEnabled">TRUE</pref>
			</ModifyPrefsRequest>`, account1Token
		);
		assert.notExists(prefRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" p="${lastName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${lastName}</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn, 'Search result should exist');
		assert.exists(searchCn.id, 'Contact id should exist');
	});


	it('Sanity | Send a message and auto-add the contact (email address only) - Verify email is saved', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const emailOnly = `email${common.getUniqueString()}@example.com`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${emailOnly}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${emailOnly}</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn, 'Search result should exist');
		assert.exists(searchCn.id, 'Contact id should exist');

		// Get contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, account1Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		assert.exists(attrs.email, 'email attr should exist');
		assert.equal(attrs.email, emailOnly, 'Email should match');
	});


	it('Functional | Send a message and auto-add the contact (First M Last) - Verify email, first, middle initial, last name is saved', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const emailAddress = `email${common.getUniqueString()}@domain.com`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${emailAddress}" p="First M. ${lastName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${lastName}</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn, 'Search result should exist');
		assert.exists(searchCn.id, 'Contact id should exist');

		// Get contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, account1Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		assert.exists(attrs.email, 'email attr should exist');
		assert.equal(attrs.email, emailAddress, 'Email should match');
		if (attrs.firstName) assert.equal(attrs.firstName, 'First', 'firstName should match');
		if (attrs.middleName) assert.equal(attrs.middleName, 'M.', 'middleName should match');
		if (attrs.lastName) assert.equal(attrs.lastName, lastName, 'lastName should match');
		if (attrs.fullName) assert.equal(attrs.fullName, `First M. ${lastName}`, 'fullName should match');
	});


	it('Functional | Send a message and auto-add the contact (First Middle Last) - Verify email, first, middle, last name is saved', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const emailAddress = `email5${common.getUniqueString()}@domain.com`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${emailAddress}" p="First Middle ${lastName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Search for contact
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${lastName}</query>
			</SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Search should not fault');
		const searchCn = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn[0] : searchRes.SearchResponse.cn;
		assert.exists(searchCn, 'Search result should exist');
		assert.exists(searchCn.id, 'Contact id should exist');

		// Get contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchCn.id}"/>
			</GetContactsRequest>`, account1Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		assert.exists(attrs.email, 'email attr should exist');
		assert.equal(attrs.email, emailAddress, 'Email should match');
		if (attrs.firstName) assert.equal(attrs.firstName, 'First', 'firstName should match');
		if (attrs.middleName) assert.equal(attrs.middleName, 'Middle', 'middleName should match');
		if (attrs.lastName) assert.equal(attrs.lastName, lastName, 'lastName should match');
		if (attrs.fullName) assert.equal(attrs.fullName, `First Middle ${lastName}`, 'fullName should match');
	});


	it('Functional | Send message to multiple contacts', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="c" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content to multiple recipients</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Send and verify sent message in sent folder', async () => {
		const subject = `subject${common.getUniqueString()}`;

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>verify sent folder content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent subject:(${subject})</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
	});


	it('Functional | Reply to message from contact', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>reply test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>reply test message</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Forward message to contact', async () => {
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Fwd: forward test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>forwarded message</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Forward should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});
});
