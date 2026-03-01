import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Date', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const GENTIME = { name: `GENTIME_${common.getUniqueString()}`, subject: `GENTIME_${common.getUniqueString()}`, from: accountEmail, content: `GENTIME_${common.getUniqueString()}`, value: `GENTIME_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `GENTIME_id`, toString() { return this.name; } };
	const decimal = { name: `decimal_${common.getUniqueString()}`, subject: `decimal_${common.getUniqueString()}`, from: accountEmail, content: `decimal_${common.getUniqueString()}`, value: `decimal_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `decimal_id`, toString() { return this.name; } };
	const defaultlocale = { name: `defaultlocale_${common.getUniqueString()}`, subject: `defaultlocale_${common.getUniqueString()}`, from: accountEmail, content: `defaultlocale_${common.getUniqueString()}`, value: `defaultlocale_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultlocale_id`, toString() { return this.name;
	defaultlocale.timezone = "America/Los_Angeles";
	negative.date = "-1";
	negative.month = "-1";
	negative.year = "-1";
	search.text = "abc";
	decimal.date = "1.5";
	decimal.month = "1.5";
	decimal.year = "1.5";
	GENTIME = "20061225103000Z"; } };
	const invalid = { name: `invalid_${common.getUniqueString()}`, subject: `invalid_${common.getUniqueString()}`, from: accountEmail, content: `invalid_${common.getUniqueString()}`, value: `invalid_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `invalid_id`, toString() { return this.name; } };
	const negative = { name: `negative_${common.getUniqueString()}`, subject: `negative_${common.getUniqueString()}`, from: accountEmail, content: `negative_${common.getUniqueString()}`, value: `negative_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `negative_id`, toString() { return this.name; } };
	const search = { name: `search_${common.getUniqueString()}`, subject: `search_${common.getUniqueString()}`, from: accountEmail, content: `search_${common.getUniqueString()}`, value: `search_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `search_id`, toString() { return this.name; } };

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
	it('Regression | Search with negative value of date in before query (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with negative after date (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with negative date (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Month in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Month in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Month', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Year in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Year in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search for negative value of Year', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for mails before 50 years', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:1/1/1955</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Regression | Search with wrong Date Formate in query after - using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with wrong Date Formate in query before - using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with wrong Date Formate using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date in after query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date in before query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month in after - query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month in before - query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>after:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>before:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                
				<query>date:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		assert.match(res.Fault?.Detail?.Error?.Code, /(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});
});
