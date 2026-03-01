import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > ActionRequest ZCS 3441', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const admin = { name: `admin_${common.getUniqueString()}`, subject: `admin_${common.getUniqueString()}`, from: accountEmail, content: `admin_${common.getUniqueString()}`, value: `admin_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `admin_id`, toString() { return this.name; } };
	const folder = { name: `folder_${common.getUniqueString()}`, subject: `folder_${common.getUniqueString()}`, from: accountEmail, content: `folder_${common.getUniqueString()}`, value: `folder_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_id`, toString() { return this.name; } };
	const folder2 = { name: `folder2_${common.getUniqueString()}`, subject: `folder2_${common.getUniqueString()}`, from: accountEmail, content: `folder2_${common.getUniqueString()}`, value: `folder2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder2_id`, toString() { return this.name; } };
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
	const subject = { name: `subject_${common.getUniqueString()}`, subject: `subject_${common.getUniqueString()}`, from: accountEmail, content: `subject_${common.getUniqueString()}`, value: `subject_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `subject_id`, toString() { return this.name; } };
	const subject1 = { name: `subject1_${common.getUniqueString()}`, subject: `subject1_${common.getUniqueString()}`, from: accountEmail, content: `subject1_${common.getUniqueString()}`, value: `subject1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `subject1_id`, toString() { return this.name; } };
	const test_account1 = { name: `test_account1_${common.getUniqueString()}`, subject: `test_account1_${common.getUniqueString()}`, from: accountEmail, content: `test_account1_${common.getUniqueString()}`, value: `test_account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `test_account1_id`, toString() { return this.name; } };

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
	it('Sanity | Verify SearchAction Request with move action for new folder for multiple mails', async () => {
		// Admin auth
		adminAuthToken = await soap.getAdminAuthToken();
		// SendMsgRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
			<m>
			<e t="t" a="${test_account1.name}" />
			<su>${subject1}</su>
			<mp ct="text/plain">
			<content>${message.content1}</content>
			</mp>
			</m>
			</SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		message.id1 = res2.SendMsgResponse?.m[0].id;

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
			<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>from:${admin.user}</query>
			</SearchRequest>
			<BulkAction op="move" l="${folder.name}" />
			</SearchActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchActionResponse, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
			sortBy="dateDesc" offset="0" limit="25">
			<query>in:${folder.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify SearchAction Request with move action for inbox folder with subject as query', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
			<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>subject:(${subject})</query>
			</SearchRequest>
			<BulkAction op="move" l="Inbox" />
			</SearchActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchActionResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
			sortBy="dateDesc" offset="0" limit="25">
			<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify SearchAction Request with move action for new folder with query having multiple params', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
			<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>subject:(${subject}) from:${admin.user}</query>
			</SearchRequest>
			<BulkAction op="move" l="${folder.name}" />
			</SearchActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchActionResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
			sortBy="dateDesc" offset="0" limit="25">
			<query>in:${folder.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify SearchActionRequest for move to invalid folder', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
			<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>from:${admin.user}</query>
			</SearchRequest>
			<BulkAction op="move" l="Invalid_folder" />
			</SearchActionRequest>`, accountAuthToken
		);

		assert.exists(res2.Fault, 'Response should be a Fault');
		assert.include(res2.Fault?.Detail?.Error?.Code, 'mail.NO_SUCH_FOLDER', 'Fault code should match');
	});


	it('Sanity | Verify SearchActionRequest for move to subfolders', async () => {
		// SearchRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
			<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>from:${admin.user}</query>
			</SearchRequest>
			<BulkAction op="move" l="/Inbox/${folder2.name}" />
			</SearchActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchActionResponse, 'Response element should exist');

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
			sortBy="dateDesc" offset="0" limit="25">
			<query>in:/inbox/${folder2.name}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
