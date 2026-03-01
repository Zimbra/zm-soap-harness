import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Search > Folder > Mountpoint > Remote', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountAuthToken, accountAuthToken2;
	let accountEmail, accountEmail2;
	const account1 = {};
	const account2 = {};

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 (owner)
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1.id = res1.CreateAccountResponse.account[0].id;
		account1.name = accountEmail;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2 (grantee)
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2.id = res2.CreateAccountResponse.account[0].id;
		account2.name = accountEmail2;
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create folder1 under account1's inbox (id=2)
		account1.folder1 = { name: `folder_${common.getUniqueString()}` };
		const resF1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${account1.folder1.name}" l="2" view="message"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		account1.folder1.id = resF1.CreateFolderResponse.folder[0].id;

		// Add message1 to folder1
		account1.message1 = { subject: `foldermsg_${common.getUniqueString()}` };
		const resM1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account1.folder1.id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: U1 ${account1.message1.subject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)

Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		account1.message1.id = resM1.AddMsgResponse.m[0].id;
		account1.message1.cid = resM1.AddMsgResponse.m[0].cid;

		// Create folder2 (subfolder) under folder1
		account1.folder2 = { name: `subfolder_${common.getUniqueString()}` };
		const resF2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${account1.folder2.name}" l="${account1.folder1.id}" view="message"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		account1.folder2.id = resF2.CreateFolderResponse.folder[0].id;

		// Add message2 to folder2
		account1.message2 = { subject: `subfoldermsg_${common.getUniqueString()}` };
		const resM2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${account1.folder2.id}">
					<content>To: foo@example.com
From: bar@example.com
Subject: U1 ${account1.message2.subject}
Date: Mon, 30 Oct 2006 20:27:31 -0800 (PST)

Sample Content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);
		account1.message2.id = resM2.AddMsgResponse.m[0].id;
		account1.message2.cid = resM2.AddMsgResponse.m[0].cid;

		// Share folder1 with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account1.folder1.id}" op="grant">
					<grant d="${account2.name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);

		// Login as account2 and create mountpoints
		// Mountpoint1 -> account1's folder1
		account2.mountpoint1 = { name: `mountpoint_${common.getUniqueString()}` };
		const resMP1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${account2.mountpoint1.name}" view="message" rid="${account1.folder1.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		account2.mountpoint1.id = resMP1.CreateMountpointResponse.link[0].id;

		// Submountpoint1 -> account1's folder2
		account2.submountpoint1 = { name: `submountpoint_${common.getUniqueString()}` };
		const resSMP1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${account2.submountpoint1.name}" view="message" rid="${account1.folder2.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		account2.submountpoint1.id = resSMP1.CreateMountpointResponse.link[0].id;

		// Duplicate mountpoint -> same folder1
		account2.dupmountpoint1 = { name: `dupmountpoint_${common.getUniqueString()}` };
		const resDMP1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${account2.dupmountpoint1.name}" view="message" rid="${account1.folder1.id}" zid="${account1.id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		account2.dupmountpoint1.id = resDMP1.CreateMountpointResponse.link[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify search by inid - mountpoint returns remote items (Bug: 7083)', async () => {
		// SearchRequest by mountpoint1 ID
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:(${account2.mountpoint1.id})</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Messages should exist');
		assert.match(res2.SearchResponse.m[0].id, new RegExp(`${account1.id}:`), 'id should contain account1 id');

		// SearchRequest by submountpoint1 ID
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:(${account2.submountpoint1.id})</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Messages should exist');
		assert.match(res3.SearchResponse.m[0].id, new RegExp(`${account1.id}:`), 'id should contain account1 id');
	});


	it('Sanity | Verify search by in - mountpoint (Bug: 7083)', async () => {
		// SearchRequest by mountpoint1 name
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"/${account2.mountpoint1.name}"</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Messages should exist');

		// SearchRequest by submountpoint1 name
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"/${account2.submountpoint1.name}"</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse?.m, 'Messages should exist');
	});


	it('Sanity | Verify search by in - , local mountpoint, remote subfolder (Bug: 7083)', async () => {
		// SearchRequest using mountpoint/subfolder path
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"/${account2.mountpoint1.name}/${account1.folder2.name}"</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Messages should exist');
	});


	it('Sanity | Verify SearchConv by inid - mountpoint returns remote items (Bug: 9396)', async () => {
		// SearchConvRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${account1.id}:${account1.message1.cid}">
				<query>inid:(${account2.mountpoint1.id})</query>
			</SearchConvRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchConvResponse, 'Response element should exist');
	});


	it('Sanity | Verify SearchConv by in - mountpoint returns remote items (Bug: 47084)', async () => {
		// SearchConvRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${account1.id}:${account1.message1.cid}">
				<query>in:"${account2.mountpoint1.name}"</query>
			</SearchConvRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchConvResponse, 'Response element should exist');
	});


	it('Sanity | Verify SearchConv by in - mountpoint, remote returns remote items (Bug: 9396)', async () => {
		// SearchConvRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${account1.id}:${account1.message2.cid}">
				<query>in:"${account2.mountpoint1.name}/${account1.folder2.name}"</query>
			</SearchConvRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchConvResponse, 'Response element should exist');
	});


	it('Sanity | Verify search by in - mountpoint1 OR in - mountpoint2 (where both mp point to the same folder) returns one remote item (Bug 7083, comment 4) (Bug: 7083)', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:${account2.mountpoint1.id} OR inid:${account2.dupmountpoint1.id}</query>
			</SearchRequest>`, accountAuthToken2
		);

		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Messages should exist');
	});
});
