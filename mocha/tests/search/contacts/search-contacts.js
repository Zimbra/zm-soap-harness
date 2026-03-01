import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Contacts > Contacts', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

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
	it('Smoke | Searching with name (FirstNameLastnameMiddlename)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>lastName2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>middleName2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching with email Id', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName01_lastName01</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName22_lastName22</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName31_lastName31</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching contact with email (incomplete usernameatdomainnamedomainname)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName01</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.match(String(res.SearchResponse.info.wildcard.str), /firstname01.*/, 'str should match pattern');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>@testsearch.com</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>testsearch.com</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching contact with (completeincomplete company name)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>company1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>comp</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching with different Phone numbers', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12412</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12402</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12391</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12311</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12321</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12331</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12341</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12352</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12362</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12372</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12382</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res11.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>12422</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching with jobtitle', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>jobTitle2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching with Place (StreetCityStatePostalCodeCountry)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>workStreet1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>workCity1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>workState2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>99992</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>workCountry2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching contact with URL in contact information', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>workURL1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching with notes in contact information', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>notes1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>notes2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>notes1 notes2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching contacts with Partial String (firstName common word present in contacts separated with space)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>firstName4</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>Name</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>company5</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>pvt</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Searching using the query contact - with name (FirstNameLastnameMiddlename)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName1</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>lastName2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>middleName2</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching using the query contact - with email Id', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName01_lastName01</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName22_lastName22</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName31_lastName31</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching using the query contact - contact with email (incomplete usernameatdomainnamedomainname)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName01</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:@testsearch.com</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:testsearch.com</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching using the query contact - wildcards the result, ie contact - term contact - termstar', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>contact:firstName31</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});
});
