import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Search Flags', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const nonexistingFlags = 'nonexisting';
	const blankFlags = '';
	const spaceFlags = ' ';
	const digitsFlags = '1234';
	const specialsymbolFlags = '#%^';
	const capitalletterFlags = 'FLAGGED';
	const capitalsmallletterFlags = 'FlAgGeD';
	const positiveFlags = '+123';
	const negativeFlags = '-123';
	const alphanumericFlags = config.accountPassword;
	let emailidFlags;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		emailidFlags = accountEmail;
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
	it('Sanity | Search with flagged mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:flagged</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search with nonexisting flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${nonexistingFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with blank as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${blankFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with space as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${spaceFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with only digits as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${digitsFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with only special symbols as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${specialsymbolFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with existing flag name in Capital letters', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${capitalletterFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | Search with existing flag name in both Capital and small letters', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${capitalsmallletterFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | Search with 0 as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:0 </query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with a positive value as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${positiveFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with a negative value as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${negativeFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with alphanumeric value as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${alphanumericFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Regression | Search with email id as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:${emailidFlags}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.isString(res.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res.Fault?.Detail?.Error?.Code, 'mail.QUERY_PARSE_ERROR', 'Fault code should match');
	});


	it('Functional | Search with a mail which is flagged, unflagged and read, unread and replied and forwarded as flag name', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:unflagged is:read is:replied is:forwarded</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search for unflagged mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:unflagged</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search for read mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:read</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search for unread mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:unread</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search for replied mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:replied</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Search for forwarded mails', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query> is:forwarded</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
