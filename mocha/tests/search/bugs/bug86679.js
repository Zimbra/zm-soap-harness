import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug86679', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const conv = { name: `conv_${common.getUniqueString()}`, subject: `conv_${common.getUniqueString()}`, from: accountEmail, content: `conv_${common.getUniqueString()}`, value: `conv_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `conv_id`, toString() { return this.name; } };
	const fold = { name: `fold_${common.getUniqueString()}`, subject: `fold_${common.getUniqueString()}`, from: accountEmail, content: `fold_${common.getUniqueString()}`, value: `fold_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fold_id`, toString() { return this.name; } };
	const fromname = { name: `fromname_${common.getUniqueString()}`, subject: `fromname_${common.getUniqueString()}`, from: accountEmail, content: `fromname_${common.getUniqueString()}`, value: `fromname_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `fromname_id`, toString() { return this.name; } };
	const newfolder1 = { name: `newfolder1_${common.getUniqueString()}`, subject: `newfolder1_${common.getUniqueString()}`, from: accountEmail, content: `newfolder1_${common.getUniqueString()}`, value: `newfolder1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `newfolder1_id`, toString() { return this.name; } };
	const newfolder2 = { name: `newfolder2_${common.getUniqueString()}`, subject: `newfolder2_${common.getUniqueString()}`, from: accountEmail, content: `newfolder2_${common.getUniqueString()}`, value: `newfolder2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `newfolder2_id`, toString() { return this.name; } };

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
	it('Functional | is - fromme does not work as expected (Bug: 86679)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateFolderRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name = "${newfolder1}" l = "1"/>
            </CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const fold_id1 = res2.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name = "${newfolder2}" l = "2"/>
            </CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const fold_id2 = res3.CreateFolderResponse?.folder?.[0].id;

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
                <query>subject:test</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const conv_id = res4.SearchResponse?.c?.[0].id;

		// ConvAction
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
                <action id="${conv.id}" l="${fold.id1}" op="move"/>
            </ConvActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:${newfolder1} is:fromme</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>${account1.name}</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>test move</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>${fromname}</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>is:fromme</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// ConvAction
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest  xmlns="urn:zimbraMail">
                <action id="${conv.id}" l="${fold.id2}" op="move"/>
            </ConvActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');

		// SearchRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:Inbox/${newfolder2} is:fromme</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');

		// SearchRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>${fromname}</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.SearchResponse, 'SearchResponse should exist');
	});
});
