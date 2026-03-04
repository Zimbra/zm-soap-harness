import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Search Date', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const negative = { date: '-1', month: '-1', year: '-1' };
	const search = { text: 'abc' };
	const decimal = { date: '1.5', month: '1.5', year: '1.5' };
	const GENTIME = '20061225103000Z';
	const defaultlocale = { timezone: 'America/Los_Angeles' };
	const invalid = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Regression | Search with negative value of date in before query (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search with negative after date (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search with negative date (Bug: 1781)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${negative.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Month in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Month in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Month', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${negative.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Year in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Year in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
	});


	it('Regression | Search for negative value of Year', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${negative.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response - server may or may not fault on negative dates
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
			assert.match(res.Fault.Detail.Error.Code,
				/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
		} else {
			assert.notExists(res.Fault, 'SearchResponse should exist');
		}
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
	});


	it('Regression | Search with wrong Date Formate in query after - using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with wrong Date Formate in query before - using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Regression | Search with wrong Date Formate using variable GENTIME', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${GENTIME}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date in after query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date in before query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Date (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${invalid.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month in after - query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month in before - query (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search for invalid value of Month (Bug: 1305)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${invalid.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with text', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${search.text}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of date', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${decimal.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of month', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${decimal.month}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year in after query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>after:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year in before query', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>before:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});


	it('Functional | Search with decimal value of year', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
				<query>date:${decimal.year}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(res.Fault, 'Response should be a Fault');
		assert.isString(res.Fault.Detail.Error.Code, 'Fault code should be a string');
		assert.match(res.Fault.Detail.Error.Code,
			/(service.INVALID_REQUEST|mail.QUERY_PARSE_ERROR)/, 'Fault code should match');
	});
});
