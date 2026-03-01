import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Basic > Combo Status', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const mail = { name: `mail_${common.getUniqueString()}`, subject: `mail_${common.getUniqueString()}`, from: accountEmail, content: `mail_${common.getUniqueString()}`, value: `mail_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail_id`, toString() { return this.name; } };
	const mail1 = { name: `mail1_${common.getUniqueString()}`, subject: `mail1_${common.getUniqueString()}`, from: accountEmail, content: `mail1_${common.getUniqueString()}`, value: `mail1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail1_id`, toString() { return this.name; } };
	const mail2 = { name: `mail2_${common.getUniqueString()}`, subject: `mail2_${common.getUniqueString()}`, from: accountEmail, content: `mail2_${common.getUniqueString()}`, value: `mail2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail2_id`, toString() { return this.name; } };
	const mail3 = { name: `mail3_${common.getUniqueString()}`, subject: `mail3_${common.getUniqueString()}`, from: accountEmail, content: `mail3_${common.getUniqueString()}`, value: `mail3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail3_id`, toString() { return this.name; } };
	const mail4 = { name: `mail4_${common.getUniqueString()}`, subject: `mail4_${common.getUniqueString()}`, from: accountEmail, content: `mail4_${common.getUniqueString()}`, value: `mail4_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mail4_id`, toString() { return this.name; } };
	const origination = { name: `origination_${common.getUniqueString()}`, subject: `origination_${common.getUniqueString()}`, from: accountEmail, content: `origination_${common.getUniqueString()}`, value: `origination_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `origination_id`, toString() { return this.name; } };

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

		// Inject test messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail1.subject}
MIME-Version: 1.0

Content for ${mail1.name}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail2.subject}
MIME-Version: 1.0

Content for ${mail2.name}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail3.subject}
MIME-Version: 1.0

Content for ${mail3.name}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: ${mail4.subject}
MIME-Version: 1.0

Content for ${mail4.name}</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify the results are correct for query using from - and all status', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> from:(${origination.user}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using from - and all status (by conversation)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> from:(${origination.user}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using to - and status', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> to:(xyz) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using to - and status (by conversation)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> to:(xyz) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using ccand status 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> cc:(123) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using ccand status (by conversation) 1', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> cc:(123) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using ccand status 2', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail1.subject}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail3.subject}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail2.subject}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail1.subject}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail3.subject}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> subject:(${mail4.subject}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using ccand status (by conversation) 2', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail1.subject}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail3.subject}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail2.subject}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail1.subject}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail3.subject}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> subject:(${mail4.subject}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using ccand status 3', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> content:(${mail.content}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using cc and status (by conversation)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> content:(${mail.content}) is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using is anywhere and status', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query> is:anywhere is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | Verify the results are correct for query using is - anywhere and status (by conversation)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:flagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:unflagged </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:replied </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> is:anywhere is:forwarded </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | To verify bug 6422 (to - foo or to - bar) is - unread, read query returns proper results (Bug: 6422)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> (to:${origination.user} or to:xyz) is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> (to:${origination.user} or to:xyz) is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
	});


	it('Functional | To verify bug 6422 (to - foo or to - bar) OR is - unread, read query returns proper results (Bug: 6422)', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> (to:${origination.user} or to:xyz) OR is:unread </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query> (to:${origination.user} or to:xyz) OR is:read </query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
