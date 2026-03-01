import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug75100', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const COUNTER = { name: `COUNTER_${common.getUniqueString()}`, subject: `COUNTER_${common.getUniqueString()}`, from: accountEmail, content: `COUNTER_${common.getUniqueString()}`, value: `COUNTER_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `COUNTER_id`, toString() { return this.name; } };
	const TIME = { name: `TIME_${common.getUniqueString()}`, subject: `TIME_${common.getUniqueString()}`, from: accountEmail, content: `TIME_${common.getUniqueString()}`, value: `TIME_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `TIME_id`, toString() { return this.name; } };
	const account0 = { name: `account0_${common.getUniqueString()}`, subject: `account0_${common.getUniqueString()}`, from: accountEmail, content: `account0_${common.getUniqueString()}`, value: `account0_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account0_id`, toString() { return this.name; } };
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const folder1 = { name: `folder1_${common.getUniqueString()}`, subject: `folder1_${common.getUniqueString()}`, from: accountEmail, content: `folder1_${common.getUniqueString()}`, value: `folder1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder1_id`, toString() { return this.name; } };
	const folder2 = { name: `folder2_${common.getUniqueString()}`, subject: `folder2_${common.getUniqueString()}`, from: accountEmail, content: `folder2_${common.getUniqueString()}`, value: `folder2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `folder2_id`, toString() { return this.name; } };
	const subject1 = { name: `subject1_${common.getUniqueString()}`, subject: `subject1_${common.getUniqueString()}`, from: accountEmail, content: `subject1_${common.getUniqueString()}`, value: `subject1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `subject1_id`, toString() { return this.name; } };
	const subject2 = { name: `subject2_${common.getUniqueString()}`, subject: `subject2_${common.getUniqueString()}`, from: accountEmail, content: `subject2_${common.getUniqueString()}`, value: `subject2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `subject2_id`, toString() { return this.name; } };

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
	it('Sanity | Search query', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Unknown
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)

		// CreateFolderRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder l="${account0.folder.root.id}" name="${folder1.name}"/>
            </CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const account0_folder1_id = res3.CreateFolderResponse?.folder?.[0].id;

		// CreateFolderRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder l="${account0.folder.root.id}" name="${folder2.name}"/>
            </CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const account0_folder2_id = res4.CreateFolderResponse?.folder?.[0].id;

		// AddMsgRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${account0.folder1.id}">
                    <content>Date: Wed, 28 Nov 2007 05:15:48 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: ${subject1.name}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
hi This is message1
                    </content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		const account0_message1_id = res5.AddMsgResponse.m[0].id;

		// AddMsgRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${account0.folder2.id}">
                    <content>Date: Wed, 28 Nov 2007 05:15:48 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: ${subject2.name}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
hi This is message2
                    </content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		const account0_message2_id = res6.AddMsgResponse.m[0].id;

		// FolderActionRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${account0.folder1.id}" op="grant" >
                    <grant gt="usr" d="${account1.name}" perm="rw" />
                </action>
            </FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.FolderActionResponse.action, 'Response element should exist');

		// FolderActionRequest
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
                <action id="${account0.folder2.id}" op="grant" >
                    <grant gt="usr" d="${account1.name}" perm="rw" />
                </action>
            </FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.FolderActionResponse.action, 'Response element should exist');

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Unknown
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)

		// CreateMountpointRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="${account1.folder.root.id}" name="folder1${TIME}${COUNTER}" zid="${account0.id}" rid="${account0.folder1.id}" view="message"/>
            </CreateMountpointRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		const account1_folder1_shared_id = res11.CreateMountpointResponse.link.id;

		// CreateMountpointRequest
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="${account1.folder.root.id}" name="folder2${TIME}${COUNTER}" zid="${account0.id}" rid="${account0.folder2.id}" view="message"/>
            </CreateMountpointRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		const account1_folder2_shared_id = res12.CreateMountpointResponse.link.id;

		// SearchRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>message1 AND (underid:"${account0.id}:${account0.folder1.id}" or underid:"${account0.id}:${account0.folder2.id}")</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.equal(res13.SearchResponse?.m?.[0].id, '${account0.id}:${account0.message1.id}', 'id should match');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res14 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
			<query>message2 AND (underid:"${account0.id}:${account0.folder1.id}" or underid:"${account0.id}:${account0.folder2.id}")</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res14.Fault, 'Response should not be a Fault');
		assert.equal(res14.SearchResponse?.m?.[0].id, '${account0.id}:${account0.message2.id}', 'id should match');
		// XPath expression removed (not valid JS)
	});
});
