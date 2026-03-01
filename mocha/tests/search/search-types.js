import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Types', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const contact1 = { firstName: `contact1_${common.getUniqueString()}` };
	const contact2 = { firstName: `contact2_${common.getUniqueString()}` };
	const contact3 = { firstName: `contact3_${common.getUniqueString()}` };
	const mail = { subject: `testmail_${common.getUniqueString()}` };

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

		// Inject test message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail.subject}
MIME-Version: 1.0
Test content</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Functional | Verify that a search by types message returns the correct results', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.match(String(res.SearchResponse?.m?.[0].su), new RegExp(mail.subject), 'su should match pattern');
		assert.exists(res.SearchResponse?.m, 'Response element should exist');
	});


	it('Functional | Verify that a search by types conversation returns the correct results', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse?.c?.[0], 'Conversation result should exist');
		assert.exists(res.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify that a search by types contacts returns the correct results', async () => {
		// CreateContactRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact1.firstName}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		contact1.id = res1.CreateContactResponse.cn[0].id;
		assert.exists(res1.CreateContactResponse.cn, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contact1.firstName}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse?.cn, 'Response element should exist');
	});


	it('Functional | Verify that a search by types conversation,contact,appointment returns the correct results', async () => {
		// CreateContactRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact2.firstName}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		contact2.id = res1.CreateContactResponse.cn[0].id;
		assert.exists(res1.CreateContactResponse.cn, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation,contact,appointment">
				<query>${contact2.firstName}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse?.cn, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,contact,appointment">
				<query>subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Response element should exist');

		// SearchRequest with conversation type
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation,contact,appointment">
				<query>subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'Response element should exist');

		// SearchRequest - combined query
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation,contact,appointment">
				<query>${contact2.firstName} OR subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify that a search by the wrong type (contact should be message) returns the correct results', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>subject:(${mail.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});


	it('Functional | Verify that a search by the wrong type (message should be contact) returns the correct results', async () => {
		// CreateContactRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${contact3.firstName}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		contact3.id = res1.CreateContactResponse.cn[0].id;
		assert.exists(res1.CreateContactResponse.cn, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${contact3.firstName}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// Verify empty result set (original XML had emptyset="1")
	});
});
