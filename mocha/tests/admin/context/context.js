import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Context > Context', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account2Id;
	let account3Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account 1
		account1Email = `user${common.getUniqueString()}@${config.testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Account 1 creation should not fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0] : createRes1.CreateAccountResponse.account;
		const host = acct1.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		account1Id = acct1.id;

		// Create test account 2
		account2Email = `user${common.getUniqueString()}@${config.testDomain}`;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Account 2 creation should not fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0] : createRes2.CreateAccountResponse.account;
		const host2 = acct2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		account2Id = acct2.id;

		// Create test account 3
		account3Email = `user${common.getUniqueString()}@${config.testDomain}`;
		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes3.Fault, 'Account 3 creation should not fault');
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
	it('Sanity | Create a folder in an email account, using context specified by name', async () => {
		// GetFolderRequest using admin delegated access by account name
		const getFolderRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, adminAuthToken, account1Email
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolderId = getFolderRes.GetFolderResponse.folder[0].id;
		assert.equal(rootFolderId, `${account1Id}:1`, 'Root folder id should match account:1');

		// CreateFolderRequest in account context
		const createFolderRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="blahblah" l="1"/>
			</CreateFolderRequest>`, adminAuthToken, account1Email
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;
		assert.match(folderId, new RegExp(`^${account1Id}:`), 'Folder id should start with account id');

		// Verify folder exists via GetFolderRequest
		const verifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, adminAuthToken, account1Email
		);
		assert.notExists(verifyRes.Fault, 'Verify GetFolderRequest should not fault');
		assert.exists(verifyRes.GetFolderResponse.folder, 'Folder response should have folders');

		// Delete the folder
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, adminAuthToken, account1Email
		);
		assert.notExists(deleteRes.Fault, 'FolderActionRequest should not fault');
		const action = deleteRes.FolderActionResponse.action;
		assert.equal(action.op, 'delete', 'Action op should be delete');
		assert.equal(action.id, folderId, 'Action id should match folder id');
	});


	it('Sanity | Create a folder in an email account, using context specified by id', async () => {
		// GetFolderRequest using admin delegated access by account id
		const getFolderRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, adminAuthToken, account2Email
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolderId = getFolderRes.GetFolderResponse.folder[0].id;
		assert.equal(rootFolderId, `${account2Id}:1`, 'Root folder id should match account:1');

		// CreateFolderRequest in account context
		const createFolderRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="blahblah" l="1"/>
			</CreateFolderRequest>`, adminAuthToken, account2Email
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;
		assert.match(folderId, new RegExp(`^${account2Id}:`), 'Folder id should start with account id');

		// Verify folder exists via GetFolderRequest
		const verifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, adminAuthToken, account2Email
		);
		assert.notExists(verifyRes.Fault, 'Verify GetFolderRequest should not fault');
		assert.exists(verifyRes.GetFolderResponse.folder, 'Folder response should have folders');

		// Delete the folder
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, adminAuthToken, account2Email
		);
		assert.notExists(deleteRes.Fault, 'FolderActionRequest should not fault');
		const action = deleteRes.FolderActionResponse.action;
		assert.equal(action.op, 'delete', 'Action op should be delete');
		assert.equal(action.id, folderId, 'Action id should match folder id');
	});


	it('Sanity | Inject a message into an account, specified by name', async () => {
		// AddMsgRequest using admin delegated access by account name
		const addMsgRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1"><content>Subject: hello

do it
</content></m>
			</AddMsgRequest>`, adminAuthToken, account3Email
		);

		// Verify message was added
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addMsgRes.AddMsgResponse.m)
			? addMsgRes.AddMsgResponse.m[0] : addMsgRes.AddMsgResponse.m;
		assert.exists(msg.id, 'Message id should exist');
	});
});
