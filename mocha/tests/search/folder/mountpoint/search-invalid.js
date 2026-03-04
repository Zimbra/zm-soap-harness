import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Search > Folder > Mountpoint > Search Invalid', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountAuthToken, accountAuthToken2;
	let accountEmail, accountEmail2, accountEmail3, accountEmail4;
	let accountAuthToken3, accountAuthToken4;
	const account1 = {};
	const account2 = {};
	const account3 = {};
	const account4 = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1.id = res1.CreateAccountResponse.account[0].id;
		const host = res1.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1.name = accountEmail;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2.id = res2.CreateAccountResponse.account[0].id;
		const host2 = res2.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account2.name = accountEmail2;
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create account3
		accountEmail3 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail3}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account3.id = res3.CreateAccountResponse.account[0].id;
		const host3 = res3.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
		account3.name = accountEmail3;
		accountAuthToken3 = await soap.getAccountAuthToken(accountEmail3);

		// Create account4
		accountEmail4 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail4}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account4.id = res4.CreateAccountResponse.account[0].id;
		const host4 = res4.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'zimbraMailHost should exist');
		account4.name = accountEmail4;
		accountAuthToken4 = await soap.getAccountAuthToken(accountEmail4);
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
	it('Regression | Verify is - remote search for invalid mountpoint 1 (Bug: 18623)', async () => {
		// Login as account1
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create folder in account1's inbox (id=2)
		const folderName = `folder_${common.getUniqueString()}`;
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2" view="message"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		account1.folder1 = { id: res3.CreateFolderResponse.folder[0].id, name: folderName };

		// Add message to account1's folder
		const msgSubject = `message_${common.getUniqueString()}`;
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account1.folder1.id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${msgSubject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)
Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		account1.message1 = { id: res4.AddMsgResponse.m[0].id };

		// Share account1's folder with account2
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account1.folder1.id}" op="grant">
					<grant d="${account2.name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.FolderActionResponse.action, 'Response element should exist');

		// Login as account2
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create valid mountpoint pointing to account1's folder
		const mp1Name = `mountpoint_${common.getUniqueString()}`;
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="2" name="${mp1Name}" view="message" rid="${account1.folder1.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Create invalid mountpoint pointing to message id (should fail)
		const mp2Name = `mountpoint_${common.getUniqueString()}`;
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="2" name="${mp2Name}" view="message" rid="${account1.message1.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.isString(res9.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res9.Fault?.Detail?.Error?.Code, 'mail.NO_SUCH_FOLDER', 'Fault code should match');

		// Search for remote items - should still work
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote</query>
			</SearchRequest>`, accountAuthToken2
		);
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse?.m, 'Response element should exist');
	});


	it('Functional | Verify is - remote search for invalid mountpoint 2 (Bug: 18644)', async () => {
		// Login as account3
		accountAuthToken3 = await soap.getAccountAuthToken(accountEmail3);

		// Create folder in account3's inbox
		const folderName = `folder_${common.getUniqueString()}`;
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2" view="message"/>
			</CreateFolderRequest>`, accountAuthToken3
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		account3.folder1 = { id: res3.CreateFolderResponse.folder[0].id, name: folderName };

		// Add message
		const msgSubject = `message_${common.getUniqueString()}`;
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account3.folder1.id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${msgSubject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)
Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken3
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		account3.message1 = { id: res4.AddMsgResponse.m[0].id };

		// Share folder with account4
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account3.folder1.id}" op="grant">
					<grant d="${account4.name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken3
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.FolderActionResponse.action, 'Response element should exist');

		// Login as account4
		accountAuthToken4 = await soap.getAccountAuthToken(accountEmail4);

		// Create valid mountpoint
		const mp1Name = `mountpoint_${common.getUniqueString()}`;
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="2" name="${mp1Name}" view="message" rid="${account3.folder1.id}" zid="${account3.id}"/>
			</CreateMountpointRequest>`, accountAuthToken4
		);
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Create invalid mountpoint (should fail)
		const mp2Name = `mountpoint_${common.getUniqueString()}`;
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="2" name="${mp2Name}" view="message" rid="${account3.message1.id}" zid="${account3.id}"/>
			</CreateMountpointRequest>`, accountAuthToken4
		);
		assert.isString(res9.Fault.Detail.Error.Code, 'Response should be a Fault');
		assert.include(res9.Fault?.Detail?.Error?.Code, 'mail.NO_SUCH_FOLDER', 'Fault code should match');

		// Delete account3
		adminAuthToken = await soap.getAdminAuthToken();
		const res11 = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(res11.Fault, 'Response should not be a Fault');

		// Login as account4 and search for remote
		accountAuthToken4 = await soap.getAccountAuthToken(accountEmail4);
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:remote</query>
			</SearchRequest>`, accountAuthToken4
		);
		assert.notExists(res13.Fault, 'Response should not be a Fault');
	});
});
