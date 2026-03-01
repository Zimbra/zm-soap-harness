import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Alias Add', function () {
	let testAccount1, testAccount2, testAccount3, testAccount4, testAccount5;
	let account1Id, account3Id;
	let aliasName, aliasName2, aliasName3, aliasName4;
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		testAccount1 = `test.${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `test.${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `test.${common.getUniqueString()}@${config.testDomain}`;
		testAccount4 = `test.${common.getUniqueString()}@${config.testDomain}`;
		testAccount5 = `test.${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount1, testAccount1);
		account1Id = res1.accountId;

		const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount3, testAccount3);
		account3Id = res3.accountId;

		await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount4, testAccount4);
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount5, testAccount5);

		aliasName = `alias.${common.getUniqueString()}@${config.testDomain}`;
		aliasName2 = 'alias01'; // Invalid (no domain)
		aliasName3 = `alias@non.existing.domain${common.getUniqueString()}`;
		aliasName4 = `alias4.${common.getUniqueString()}@${config.testDomain}`;
	});

	after(async function () {
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuthToken);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuthToken);
		if (testAccount4) await soap.deleteAccount(testAccount4, adminAuthToken);
		if (testAccount5) await soap.deleteAccount(testAccount5, adminAuthToken);
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
	it('Smoke | Add an Alias to an account', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AddAccountAliasResponse, 'Alias should be added');
	});


	it('Functional | Add an invalid Alias (without domain name) to an account 1', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName2}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Functional | Add an Alias with non-existing domain name', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName3}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN',
			'Should return NO_SUCH_DOMAIN');
	});


	it('Functional | Add an Alias with names as spchar, numbers, spaces', async () => {
		const aliasSpChar = `:''<//\\@${config.testDomain}`;

		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasSpChar}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');

		const errorCode = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(errorCode.includes('service.INVALID_REQUEST') || errorCode.includes('service.PARSE_ERROR'),
			`Should return INVALID_REQUEST or PARSE_ERROR, got: ${errorCode}`
		);

		const aliasNumber = `1234${common.getUniqueString()}@${config.testDomain}`;

		// AddAccountAliasRequest
		const response2 = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasNumber}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response2.Fault, 'Response should not be a Fault');
		assert.exists(response2.AddAccountAliasResponse,
			'Numeric alias should be allowed');
	});


	it('Regression | Add an Alias with blank name', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias></alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Functional | Create duplicate alias for the same account', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS',
			'Should return ACCOUNT_EXISTS');
	});


	it('Regression | Add an alias with deleted domain', async () => {
		const domainName = `domain${common.getUniqueString()}.com`;

		// CreateDomainRequest
		const createDomain = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		const domainId = createDomain.CreateDomainResponse.domain[0].id;

		// DeleteDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domainId}</id>
			</DeleteDomainRequest>`, adminAuthToken
		);

		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>alias01.${common.getUniqueString()}@${domainName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN',
			'Should return NO_SUCH_DOMAIN');
	});


	it('Regression | Add an Alias to a non existing account', async () => {
		const nonExistentAccount =
			`nonexist.${common.getUniqueString()}@${config.testDomain}`;

		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${nonExistentAccount}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');

		const code = response.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('account.NO_SUCH_ACCOUNT') || code.includes('account.NO_SUCH_ID'),
			'Should return NO_SUCH_ACCOUNT or NO_SUCH_ID'
		);
	});


	it('Regression | Add an Alias with name same as account name', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<alias>${testAccount3}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS',
			'Should return ACCOUNT_EXISTS');
	});


	it('Functional | Add an Alias with name same as any other account name', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<alias>${testAccount1}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS',
			'Should return ACCOUNT_EXISTS');
	});


	it('Functional | Add an Alias to an account with name same as account name same as any other account name in other domain', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<alias>${testAccount4}</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS',
			'Should return ACCOUNT_EXISTS');
	});


	it('Smoke | Search a mail (sent to account1) in account1 and in alias of account1', async () => {
		// AddAccountAliasRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName4}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);
		const subject = `Subject12_${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Content...</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);

		const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		await common.sleep(4000);

		// SearchRequest
		const search1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const hit1 = search1.SearchResponse.c && search1.SearchResponse.c[0];

		// Verify response
		assert.exists(hit1, 'Mail not found in account1');

		const aliasToken = await soap.getAccountAuthToken(aliasName4, config.accountPassword);

		// SearchRequest
		const searchAlias = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const hitAlias = searchAlias.SearchResponse.c && searchAlias.SearchResponse.c[0];

		// Verify response
		assert.exists(hitAlias, 'Mail not found via alias login');
	});


	it('Smoke | Verify that messages sent from the alias shows the From - field as the real acount', async () => {
		const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

		const subject = `Subject13_${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount3}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Content</content></mp>
				</m>
			</SendMsgRequest>`, aliasToken
		);

		const auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
		await common.sleep(4000);

		// SearchRequest
		const search = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth3
		);

		const conv = search.SearchResponse.c && search.SearchResponse.c[0];

		// Verify response
		assert.exists(conv, 'Message not received');

		const sender = conv.e.find(p => p.a === testAccount1);

		// Verify response
		assert.exists(sender, 'Sender should be valid (testAccount1)');
	});


	it('Functional | Delete a mail from an accountThe mail should also get deleted from the alias account', async () => {
		const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		const subject = `Subject14_${common.getUniqueString()}`;

		const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Content...</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		// SearchRequest
		const searchMsg = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const mId = searchMsg.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${mId}" op="delete"/>
			</MsgActionRequest>`, auth1
		);

		const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

		// SearchRequest
		const searchAlias = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const hits = searchAlias.SearchResponse.m;

		// Verify response
		assert.notExists(hits, 'Message should be deleted in alias view too');
	});


	it('Functional | Delete a mail from an aliasThe mail should also get deleted from the account', async () => {
		const auth5 = await soap.getAccountAuthToken(testAccount5, config.accountPassword);
		const subject = `Subject15_${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Content...</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

		// SearchRequest
		const searchMsg = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const mId = searchMsg.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${mId}" op="delete"/>
			</MsgActionRequest>`, aliasToken
		);

		const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

		// SearchRequest
		const search = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);

		// Verify response
		assert.notExists(search.SearchResponse.m,
			'Message should be deleted in account too');
	});


	it('Functional | Check if mail sent through an account is also present in sent folder of alias or not', async () => {
		const auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		const subject = `Subject16_${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount5}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Sent content</content></mp>
				</m>
			</SendMsgRequest>`, auth1
		);

		const aliasToken = await soap.getAccountAuthToken(aliasName, config.accountPassword);

		// SearchRequest
		const searchAlias = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, aliasToken
		);

		// Verify response
		assert.exists(searchAlias.SearchResponse.m,
			'Message found in Sent folder via alias');
	});


	it('Functional | Check if mail sent through an alias is also present in sent folder of account or not', async () => {
		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);
		const subject = `Subject17_${common.getUniqueString()}`;

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount5}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Sent from alias</content></mp>
				</m>
			</SendMsgRequest>`, aliasToken
		);

		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);

		// SearchRequest
		const search = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, auth1
		);

		// Verify response
		assert.exists(search.SearchResponse.m,
			'Sent mail from alias should be in account sent');
	});


	it('Functional | Tag a mail in an account It should be seen tagged in alias too', async () => {
		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);
		const subject = `Subject18_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>tag test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// Create tag and apply
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}"
					color="1"/>
			</CreateTagRequest>`, auth1
		);
		const tagId = tagRes.CreateTagResponse.tag[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="tag"
					tag="${tagId}"/>
			</MsgActionRequest>`, auth1
		);

		// Check via alias
		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const aliasSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const aliasMsg = aliasSearch.SearchResponse.m[0];

		// Verify response
		assert.exists(aliasMsg, 'Message should exist in alias');
		assert.include(aliasMsg.t || '', tagId,
			'Tag should be visible via alias');
	});


	it('Functional | Tag a mail in an alias It should be seen tagged in account too', async () => {
		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);
		const subject = `Subject19_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>tag test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// CreateTagRequest
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}"
					color="2"/>
			</CreateTagRequest>`, aliasToken
		);
		const tagId = tagRes.CreateTagResponse.tag[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="tag"
					tag="${tagId}"/>
			</MsgActionRequest>`, aliasToken
		);

		// Check via account
		const acctSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const acctMsg = acctSearch.SearchResponse.m[0];

		// Verify response
		assert.exists(acctMsg, 'Message should exist');
		assert.include(acctMsg.t || '', tagId,
			'Tag should be visible via account');
	});


	it('Functional | Flag a mail in an account It should be seen flagged in alias too', async () => {
		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);
		const subject = `Subject20_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>flag test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="flag"/>
			</MsgActionRequest>`, auth1
		);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const aliasSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const aliasMsg = aliasSearch.SearchResponse.m[0];

		// Verify response
		assert.exists(aliasMsg, 'Should exist in alias');
		assert.include(aliasMsg.f || '', 'f',
			'Should be flagged in alias');
	});


	it('Functional | Flag a mail in an alias It should be seen flagged in account too', async () => {
		const subject = `Subject21_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>flag test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="flag"/>
			</MsgActionRequest>`, aliasToken
		);

		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);

		// SearchRequest
		const acctSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const acctMsg = acctSearch.SearchResponse.m[0];

		// Verify response
		assert.exists(acctMsg, 'Should exist in account');
		assert.include(acctMsg.f || '', 'f',
			'Should be flagged in account');
	});


	it('Functional | Move a mail in an account to another folder It should be moved in alias too', async () => {
		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);
		const subject = `Subject22_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>move test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// Move to Drafts (folder id 6)
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="move" l="6"/>
			</MsgActionRequest>`, auth1
		);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const aliasSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject}) in:drafts</query>
			</SearchRequest>`, aliasToken
		);

		// Verify response
		assert.exists(aliasSearch.SearchResponse.m,
			'Moved message should be in drafts via alias');
	});


	it('Functional | Move a mail in an alias to another folder It should be moved in account too', async () => {
		const subject = `Subject23_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>move test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// Move to Drafts (folder id 6)
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="move" l="6"/>
			</MsgActionRequest>`, aliasToken
		);

		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);

		// SearchRequest
		const acctSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject}) in:drafts</query>
			</SearchRequest>`, auth1
		);

		// Verify response
		assert.exists(acctSearch.SearchResponse.m,
			'Moved message should be in drafts via account');
	});


	it('Functional | Mark a mail in an account as read It should be seen read in alias too', async () => {
		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);
		const subject = `Subject24_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>read test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, auth1
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="read"/>
			</MsgActionRequest>`, auth1
		);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const aliasSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject}) is:read</query>
			</SearchRequest>`, aliasToken
		);

		// Verify response
		assert.exists(aliasSearch.SearchResponse.m,
			'Message should be read in alias');
	});


	it('Functional | Mark a mail in an alias as read It should be seen read in account too', async () => {
		const subject = `Subject25_${common.getUniqueString()}`;
		const auth5 = await soap.getAccountAuthToken(
			testAccount5, config.accountPassword);

		// SendMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${testAccount1}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>read test</content></mp>
				</m>
			</SendMsgRequest>`, auth5
		);
		await common.sleep(4000);

		const aliasToken = await soap.getAccountAuthToken(
			aliasName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, aliasToken
		);
		const msgId = searchRes.SearchResponse.m[0].id;

		// MsgActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="read"/>
			</MsgActionRequest>`, aliasToken
		);

		const auth1 = await soap.getAccountAuthToken(
			testAccount1, config.accountPassword);

		// SearchRequest
		const acctSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${subject}) is:read</query>
			</SearchRequest>`, auth1
		);

		// Verify response
		assert.exists(acctSearch.SearchResponse.m,
			'Message should be read in account');
	});


	it('Functional | Add an invalid Alias (without domain name) to an account 2', async () => {
		// AddAccountAliasRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<alias>invalidalias</alias>
			</AddAccountAliasRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(
			response.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});
});
