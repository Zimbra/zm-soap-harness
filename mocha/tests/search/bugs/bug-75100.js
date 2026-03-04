import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug 75100', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	const subject1 = `subject1_${common.getUniqueString()}`;
	const subject2 = `subject2_${common.getUniqueString()}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Account 0 (owner)
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Account 1 (shared user)
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
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
	it('Sanity | Search query', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create folder1 and folder2 under root (id=1)
		const folder1Name = `folder1_${common.getUniqueString()}`;
		const folder2Name = `folder2_${common.getUniqueString()}`;

		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder1Name}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const folder1Id = res1.CreateFolderResponse?.folder?.[0]?.id;

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folder2Name}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const folder2Id = res2.CreateFolderResponse?.folder?.[0]?.id;

		// Add message1 to folder1
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder1Id}">
					<content>Date: Wed, 28 Nov 2007 05:15:48 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: ${subject1}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

hi This is message1</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Add message2 to folder2
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder2Id}">
					<content>Date: Wed, 28 Nov 2007 05:15:48 -0800 (PST)
From: foo@example.com
To: bar@example.com
Subject: ${subject2}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

hi This is message2</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');

		// Grant both folders to account2
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder1Id}" op="grant">
					<grant gt="usr" d="${accountEmail2}" perm="rw" />
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder2Id}" op="grant">
					<grant gt="usr" d="${accountEmail2}" perm="rw" />
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res6.Fault, 'Response should not be a Fault');

		// Get account0's ID
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		const account0Id = res7.GetInfoResponse?.id;

		// Account2: create mountpoints
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
		const mount1Name = `shared1_${common.getUniqueString()}`;
		const mount2Name = `shared2_${common.getUniqueString()}`;

		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mount1Name}" zid="${account0Id}" rid="${folder1Id}" view="message"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mount2Name}" zid="${account0Id}" rid="${folder2Id}" view="message"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.notExists(res9.Fault, 'Response should not be a Fault');

		// Search for message1 via shared folders
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>message1 AND (in:"${mount1Name}" or in:"${mount2Name}")</query>
			</SearchRequest>`, accountAuthToken2
		);
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse?.m, 'Response element should exist for message1');

		// Search for message2 via shared folders
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>message2 AND (in:"${mount1Name}" or in:"${mount2Name}")</query>
			</SearchRequest>`, accountAuthToken2
		);
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse?.m, 'Response element should exist for message2');
	});
});
