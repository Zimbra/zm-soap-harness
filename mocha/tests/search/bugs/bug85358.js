import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug85358', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const account2 = { name: `account2_${common.getUniqueString()}`, subject: `account2_${common.getUniqueString()}`, from: accountEmail, content: `account2_${common.getUniqueString()}`, value: `account2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account2_id`, toString() { return this.name; } };
	const folder_root = { name: `folder_root_${common.getUniqueString()}`, subject: `folder_root_${common.getUniqueString()}`, from: accountEmail, content: `folder_root_${common.getUniqueString()}`, value: `folder_root_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder_root_id`, toString() { return this.name; } };
	const grant = { name: `grant_${common.getUniqueString()}`, subject: `grant_${common.getUniqueString()}`, from: accountEmail, content: `grant_${common.getUniqueString()}`, value: `grant_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `grant_id`, toString() { return this.name; } };
	const message = { name: `message_${common.getUniqueString()}`, subject: `message_${common.getUniqueString()}`, from: accountEmail, content: `message_${common.getUniqueString()}`, value: `message_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message_id`, toString() { return this.name; } };
	const test_accountid1 = { name: `test_accountid1_${common.getUniqueString()}`, subject: `test_accountid1_${common.getUniqueString()}`, from: accountEmail, content: `test_accountid1_${common.getUniqueString()}`, value: `test_accountid1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `test_accountid1_id`, toString() { return this.name; } };

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | login as the test account (Bug: 85358)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Unknown
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)

		// SendMsgRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
			<m>
			<e t="t" a="${account1.name}"/>
			<su> ${message.subject1}</su>
			<mp ct="text/plain">
			<content> ${message.content1}</content>
			</mp>
			</m>
			</SendMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		message.id1 = res3.SendMsgResponse?.m[0].id;

		// FolderActionRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${account1.inboxFolder.id}" op="grant">
                    <grant d="${account2.name}" gt="${grant.usr}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.FolderActionResponse.action, 'Response element should exist');

		// GetFolder
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateMountpointRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="${folder_root.id}" name="sharedfold" view="message" rid="${account1.inboxFolder.id}" zid="${test_accountid1.id}"/>
            </CreateMountpointRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		const account1_mount1_id = res7.CreateMountpointResponse.link.id;
		const mounted_folder_id = res7.CreateMountpointResponse.link.zid;

		// SearchRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
                <query>in:sharedfold</query>
            </SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SearchResponse, 'SearchResponse should exist');
	});
});
