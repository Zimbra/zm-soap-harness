import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Waitset > Waitset Request Folders', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account2Id;
	let account3Email;
	let account3Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `waitset${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `waitset${common.getUniqueString()}@${config.testDomain}`;
		account3Email = `waitset${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const host = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Id = acct1.id;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account2Id = acct2.id;

		// Create account
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		const host3 = acct3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
		account3Id = acct3.id;
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
	it('Smoke | Test Case for WaitSetRequest for folder changes 1 - no changes', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account1Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 2 - create folder', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account1Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 3 - create and rename folder', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account2Email);
		const folderName = `folder${common.getUniqueString()}`;
		const renamedName = `renamed${common.getUniqueString()}`;

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account2Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Perform folder action
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${renamedName}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'FolderActionRequest rename should not fault');

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 4 - create and delete folder', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account3Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account3Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 5 - create two folders', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account3Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account3Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 6 - seq increment across multiple operations', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account3Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account3Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Check for WaitSet updates
		const waitRes1 = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes1.Fault, 'First WaitSetRequest should not fault');

		// Create a folder
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Check for WaitSet updates
		const waitRes2 = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes2.Fault, 'Second WaitSetRequest should not fault');
	});


	it('Sanity | Test Case for WaitSetRequest for folder changes 7 - create, rename, and delete folder', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account3Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="f">
				<add>
					<a id="${account3Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// Perform folder action
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="renamed${common.getUniqueString()}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, accountAuthToken
		);

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});
});
