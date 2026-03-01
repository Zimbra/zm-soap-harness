import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Domain', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const domainname = { existing: `@${config.testDomain}`, nonexisting: '@zyxwv.aaa', specialsymbols: '@#%^', digits: '@123', spaces: '@ ' };

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Search with existing domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.existing}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Search with non-existing domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.nonexisting}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Search with existing domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			        <query>to:${domainname.existing}OR cc:${domainname.existing}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Sanity | Search with non-existing domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>(to:(${domainname.nonexisting}) OR cc:(${domainname.nonexisting}))</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with only digits in the domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.digits}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with only special symbols in the domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.specialsymbols}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with space in the domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.spaces}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with blank in the domain name for the received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from: </query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with only digits in the domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>to:${domainname.digits}OR cc:${domainname.digits}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with only special symbols in the domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>to:${domainname.specialsymbols}OR cc:${domainname.specialsymbols}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with space in the domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>to:${domainname.spaces}OR cc:${domainname.spaces}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with blank in the domain name for the sent mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>to: OR cc: </query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Functional | Search with same domain name for sent and received mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="subjAsc" offset="0" limit="25">
			       <query>from:${domainname.existing} OR to:${domainname.existing} OR cc:${domainname.existing}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});
});
