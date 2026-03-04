import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Notification Block > Mountpoint Parent Folder', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `account1${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `account2${common.getUniqueString()}@${config.testDomain}`;

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
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
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
	it('Sanity | Verify that the parent folder in the refresh block (GetFolderRequest) is fully qualified', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const inboxId = inbox.id;

		// Create a folder
		const f1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${inboxId}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(f1Res.Fault, 'CreateFolder1 should not fault');
		const folder1Id = f1Res.CreateFolderResponse.folder[0].id;

		// Create a folder
		const f2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder1Id}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(f2Res.Fault, 'CreateFolder2 should not fault');
		const folder2Id = f2Res.CreateFolderResponse.folder[0].id;

		// Create a folder
		const f3Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folder2Id}" name="folder${common.getUniqueString()}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(f3Res.Fault, 'CreateFolder3 should not fault');

		// Perform folder action
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folder1Id}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Grant should not fault');

		// Authenticate account
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get the folder
		const folder2Res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);
		const folders2 = folder2Res.GetFolderResponse.folder[0].folder;
		const inbox2 = folders2.find(f => f.name === 'Inbox');
		const inbox2Id = inbox2.id;

		// Create a mountpoint
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${inbox2Id}" name="mountpoint${common.getUniqueString()}"
					view="message" rid="${folder1Id}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(mpRes.Fault, 'CreateMountpointRequest should not fault');

		// Get the folder
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetFolderRequest should not fault');
	});
});
