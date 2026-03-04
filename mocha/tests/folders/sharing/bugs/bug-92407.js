import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Folders > Sharing > Bugs > Bug 92407', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id, account2Id;
	let taskFolderId;
	let taskSubject1, taskSubject2;

	before(async function () {
		await main.before(this);
		testAccount1 = `bug92407_1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `bug92407_2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount1}</account></GetAccountRequest>`, adminAuth
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		const acctInfoRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount2}</account></GetAccountRequest>`, adminAuth
		);
		assert.notExists(acctInfoRes2.Fault, 'GetAccountRequest should not fault');
		const acctInfo2 = Array.isArray(acctInfoRes2.GetAccountResponse.account)
			? acctInfoRes2.GetAccountResponse.account[0]
			: acctInfoRes2.GetAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		account1Id = res1.accountId;
		account2Id = res2.accountId;

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

		// Get Task Folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateTaskRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);

		taskFolderId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Tasks').id;

		// Create Tasks
		taskSubject1 = `TaskAcc1_${common.getUniqueString()}`;
		taskSubject2 = `TaskAcc1_2_${common.getUniqueString()}`;

		const createTaskRequest =
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${taskFolderId}">
					<inv/>
					<su>${taskSubject1}</su>
				</m>
			</CreateTaskRequest>`;

		// CreateTaskRequest
		await soap.makeSOAPEnvelopeAccount(createTaskRequest, auth1);

		const createTaskRequest2 =
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${taskFolderId}">
					<inv>
						<comp>
							<s d="${common.getDateyyyymmdd()}"/>
						</comp>
					</inv>
					<su>${taskSubject2}</su>
				</m>
			</CreateTaskRequest>`;
		await soap.makeSOAPEnvelopeAccount(createTaskRequest2, auth1);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
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
	it('Sanity | Error on sharing any folder with none permission', async () => {
		// Share with 'none' using empty perm attribute
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${taskFolderId}">
					<grant gt="usr" d="${testAccount2}" perm=""/>
				</action>
			</FolderActionRequest>`;

		// CreateMountpointRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Account 2 tries to mount
		const createMountpointRequest =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="mount_task_bug92407" view="task" rid="${taskFolderId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`;
		const res = await soap.makeSOAPEnvelopeAccount(createMountpointRequest, auth2);

		// Verify response
		assert.include(res.Fault.Detail.Error.Code, 'PERM_DENIED',
			'Should return PERM_DENIED');
	});

});
