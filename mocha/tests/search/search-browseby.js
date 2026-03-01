import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Search > Browseby', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;
	let res;

	// Test data variables (from XML properties)
	const COUNTER = { name: `COUNTER_${common.getUniqueString()}`, subject: `COUNTER_${common.getUniqueString()}`, from: accountEmail, content: `COUNTER_${common.getUniqueString()}`, value: `COUNTER_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `COUNTER_id`, toString() { return this.name; } };
	const TIME = { name: `TIME_${common.getUniqueString()}`, subject: `TIME_${common.getUniqueString()}`, from: accountEmail, content: `TIME_${common.getUniqueString()}`, value: `TIME_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `TIME_id`, toString() { return this.name; } };
	const account2 = { name: `account2_${common.getUniqueString()}`, subject: `account2_${common.getUniqueString()}`, from: accountEmail, content: `account2_${common.getUniqueString()}`, value: `account2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account2_id`, toString() { return this.name; } };
	const account3 = { name: `account3_${common.getUniqueString()}`, subject: `account3_${common.getUniqueString()}`, from: accountEmail, content: `account3_${common.getUniqueString()}`, value: `account3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account3_id`, toString() { return this.name; } };
	const admin = { name: `admin_${common.getUniqueString()}`, subject: `admin_${common.getUniqueString()}`, from: accountEmail, content: `admin_${common.getUniqueString()}`, value: `admin_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `admin_id`, toString() { return this.name; } };
	const cos01 = { name: `cos01_${common.getUniqueString()}`, subject: `cos01_${common.getUniqueString()}`, from: accountEmail, content: `cos01_${common.getUniqueString()}`, value: `cos01_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `cos01_id`, toString() { return this.name; } };
	const defaultpassword = { name: `defaultpassword_${common.getUniqueString()}`, subject: `defaultpassword_${common.getUniqueString()}`, from: accountEmail, content: `defaultpassword_${common.getUniqueString()}`, value: `defaultpassword_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultpassword_id`, toString() { return this.name; } };
	const message1 = { name: `message1_${common.getUniqueString()}`, subject: `message1_${common.getUniqueString()}`, from: accountEmail, content: `message1_${common.getUniqueString()}`, value: `message1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message1_id`, toString() { return this.name; } };

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

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0

Test content</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | BrowseRequest - browseBy domains', async () => {
		// BrowseRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="domains" />`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.BrowseResponse.bd, 'Response element should exist');
	});


	it('Sanity | BrowseRequest - browseBy objects (Bug: 4895)', async () => {
		// BrowseRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="objects"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.BrowseResponse.bd, 'Response element should exist');
	});


	it('Sanity | BrowseRequest - browseBy attachments', async () => {
		// BrowseRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="attachments"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.BrowseResponse.bd, 'Response element should exist');
	});


	it('Functional | Verify BrowseRequest returns application, octet-stream, not application, exe (Bug: 4925)', async () => {
		// Unknown
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns = "urn:zimbraAdmin">
                <name>${admin.user}</name>
                <password>${admin.password}</password>
            </AuthRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const authToken = res1.AuthResponse.authToken;

		// CreateCos
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
                <name xmlns="">cos${TIME}${COUNTER}</name>
                <a n="zimbraBatchedIndexingSize">0</a> 
            </CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const cos01_id = res2.CreateCosResponse.cos[0].id;

		// Unknown
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAccountRequest xmlns = "urn:zimbraAdmin">
                <name>${account2.name}</name>
                <password>${defaultpassword.value}</password>
			        			<a n="zimbraCOSId">${cos01.id}</a>
            </CreateAccountRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const account2_id = res3.CreateAccountResponse.account[0].id;
		const test_acct2_server = res3.CreateAccountResponse.account.a;

		// Unknown
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAccountRequest xmlns = "urn:zimbraAdmin">
                <name>${account3.name}</name>
                <password>${defaultpassword.value}</password>
			        			<a n="zimbraCOSId">${cos01.id}</a>
            </CreateAccountRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const account3_id = res4.CreateAccountResponse.account[0].id;
		const test_acct3_server = res4.CreateAccountResponse.account.a;

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// BrowseRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="attachments"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.BrowseResponse[bd='application.octet-stream'], 'Response element should exist');
		assert.exists(res6.BrowseResponse[bd='application'], 'Response element should exist');
		// Verify empty result set

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(email01A) </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		const message1_id = res7.SearchResponse?.m?.[0].id;

		// SendMsgRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
                <m origid="${message1.id}" rt="w">
                    <e t="t" a="${account3.name}"/>
                    <su>Fwd: mail with exe attachment.</su>
                    <attach>
                        <mp mid="${message1.id}" part="2"/>
                    </attach>
                </m>
            </SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SendMsgResponse, 'Response element should exist');

		// BrowseRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<BrowseRequest xmlns="urn:zimbraMail" browseBy="attachments"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.BrowseResponse[bd='application.octet-stream'], 'Response element should exist');
		assert.exists(res9.BrowseResponse[bd='application'], 'Response element should exist');
		// Verify empty result set
	});
});
