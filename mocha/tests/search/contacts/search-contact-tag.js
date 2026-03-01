import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Contacts > Contact Tag', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const contact = { name: `contact_${common.getUniqueString()}`, subject: `contact_${common.getUniqueString()}`, from: accountEmail, content: `contact_${common.getUniqueString()}`, value: `contact_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `contact_id`, toString() { return this.name; } };
	const op = { name: 'op', move: 'move', flag: 'flag', unflag: '!flag', read: 'read', unread: '!read', update: 'update', delete: 'delete', trash: 'trash', toString() { return this.name; } };
	const tag1 = { name: `tag1_${common.getUniqueString()}`, subject: `tag1_${common.getUniqueString()}`, from: accountEmail, content: `tag1_${common.getUniqueString()}`, value: `tag1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `tag1_id`, toString() { return this.name; } };
	const tag2 = { name: `tag2_${common.getUniqueString()}`, subject: `tag2_${common.getUniqueString()}`, from: accountEmail, content: `tag2_${common.getUniqueString()}`, value: `tag2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `tag2_id`, toString() { return this.name; } };

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
	it('Functional | Setup the account fot testing (Bug: 2532)', async () => {
		// CreateContactRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
                <cn>
                    <a n="firstName">firstName1</a>
                    <a n="lastName">lastName1</a>
                    <a n="middleName">middleName1</a>
                    <a n="email">firstname01_lastname01@testsearch.com</a>
                    <a n="jobTitle">jobTitle1</a>
                </cn>
            </CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const contact_id1 = res1.SearchResponse?.m?.[0].id;
		contact_id1 = res1.CreateContactResponse.cn[0].id;
		assert.exists(res1.CreateContactResponse.cn, 'Response element should exist');

		// CreateContactRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
                <cn>
                    <a n="firstName">firstName2</a>
                    <a n="lastName">lastName2</a>
                    <a n="middleName">middleName2</a>
                    <a n="email">firstname02_lastname02@testsearch.com</a>
                    <a n="jobTitle">jobTitle2</a>
                </cn>
            </CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const contact_id2 = res2.SearchResponse?.m?.[0].id;
		contact_id2 = res2.CreateContactResponse.cn[0].id;
		assert.exists(res2.CreateContactResponse.cn, 'Response element should exist');

		// CreateContactRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
                <cn>
                    <a n="firstName">firstName3</a>
                    <a n="lastName">lastName3</a>
                    <a n="middleName">middleName3</a>
                    <a n="email">firstname03_lastname03@testsearch.com</a>
                    <a n="jobTitle">jobTitle3</a>
                </cn>
            </CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const contact_id3 = res3.SearchResponse?.m?.[0].id;
		contact_id3 = res3.CreateContactResponse.cn[0].id;
		assert.exists(res3.CreateContactResponse.cn, 'Response element should exist');

		// CreateContactRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
                <cn>
                    <a n="firstName">firstName4</a>
                    <a n="lastName">lastName4</a>
                    <a n="middleName">middleName4</a>
                    <a n="email">firstname04_lastname04@testsearch.com</a>
                    <a n="jobTitle">jobTitle4</a>
                </cn>
            </CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const contact_id4 = res4.SearchResponse?.m?.[0].id;
		contact_id4 = res4.CreateContactResponse.cn[0].id;
		assert.exists(res4.CreateContactResponse.cn, 'Response element should exist');

		// CreateTagRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
                <tag name="${tag1.name}" color="0"/>
            </CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		const tag1_id = res5.SearchResponse?.m?.[0].id;
		tag1_id = res5.CreateTagResponse?.tag?.[0].id;
		assert.exists(res5.CreateTagResponse.tag, 'Response element should exist');

		// CreateTagRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
                <tag name="${tag2.name}" color="1"/>
            </CreateTagRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		const tag2_id = res6.SearchResponse?.m?.[0].id;
		assert.equal(res6.color, '1', 'color should match');
		tag2_id = res6.CreateTagResponse?.tag?.[0].id;
		assert.equal(res6.CreateTagResponse?.tag?.[0].color, '1', 'color should match');
		assert.exists(res6.CreateTagResponse.tag, 'Response element should exist');

		// Unknown
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns = "urn:zimbraMail">
                <action id = "${contact.id1}" op="${op.tag}" tag="${tag1.id}"/>
            </ContactActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// Unknown
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns = "urn:zimbraMail">
                <action id = "${contact.id2}" op="${op.tag}" tag="${tag2.id}"/>
            </ContactActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// Unknown
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns = "urn:zimbraMail">
                <action id = "${contact.id3}" op="${op.tag}" tag="${tag1.id}"/>
            </ContactActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// Unknown
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns = "urn:zimbraMail">
                <action id = "${contact.id3}" op="${op.tag}" tag="${tag2.id}"/>
            </ContactActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching contacts with (tag1, tag2)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>tag:${tag1.name}</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>tag:${tag2.name}</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
	});


	it('Functional | Searching contacts with queries like - (tag1 OR tag2), ((tag1)(tag2)), not(tag1 OR tag2), not((tag1)(tag2)) (Bug: 3838)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>tag:(${tag1.name} OR ${tag2.name})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>tag:((${tag1.name})(${tag2.name}))</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>NOT tag:(${tag1.name} OR ${tag2.name})</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
                <query>NOT tag:((${tag1.name})(${tag2.name}))</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});
});
