import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 72334', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Filter not updated when a mountpoint is renamed', async () => {
		// Create accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Account1 creates folder and grants access
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const folderName = `folder${common.getUniqueString()}`;
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		const root1 = Array.isArray(getFolderRes1.GetFolderResponse.folder)
			? getFolderRes1.GetFolderResponse.folder[0]
			: getFolderRes1.GetFolderResponse.folder;
		const inbox1 = Array.isArray(root1.folder)
			? root1.folder.find(f => f.name === 'Inbox') : root1.folder;
		const inbox1Id = inbox1.id;

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox1Id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account2 creates mountpoint and filter
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;
		const inbox2Id = inbox2.id;

		const mountName = `folder${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link rid="${folderId}" zid="${account1Id}" l="${inbox2Id}"
					name="${mountName}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const link = mountRes.CreateMountpointResponse.link || mountRes.CreateMountpointResponse;
		const mountLink = Array.isArray(link) ? link[0] : link;
		const mountId = mountLink.id;

		// Create filter pointing to mountpoint
		const subject = `test${common.getUniqueString()}`;
		const filterName = `Filter${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filterName}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is"
								value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Inbox/${mountName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account2AuthToken
		);

		// Rename the mountpoint
		const newName = `newname${common.getUniqueString()}`;
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${mountId}" name="${newName}"/>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(renameRes.Fault, 'FolderActionRequest should not fault');

		// Verify filter path was updated
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(filterRes.Fault, 'GetFilterRulesRequest should not fault');
		assert.exists(filterRes.GetFilterRulesResponse, 'Response should exist');
	});


	it('Sanity | Filter not updated when a mountpoint is deleted', async () => {
		// Create accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Account1 creates folder and grants access
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		const root1 = Array.isArray(getFolderRes1.GetFolderResponse.folder)
			? getFolderRes1.GetFolderResponse.folder[0]
			: getFolderRes1.GetFolderResponse.folder;
		const inbox1 = Array.isArray(root1.folder)
			? root1.folder.find(f => f.name === 'Inbox') : root1.folder;
		const folderName = `folder1${common.getUniqueString()}`;

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox1.id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account2 creates mountpoint
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;

		const mountName = `folder1${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link rid="${folderId}" zid="${account1Id}" l="${inbox2.id}"
					name="${mountName}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		const mountLink = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const mountId = mountLink.id;

		// Create filter and delete mountpoint
		const subject = `test${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="Filter1${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is"
								value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Inbox/${mountName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account2AuthToken
		);

		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${mountId}"/>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'FolderActionRequest should not fault');

		// Verify filter was deactivated
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(filterRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it('Sanity | Filter not updated when a mountpoint is moved', async () => {
		// Create accounts
		const account1Email = `account1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `account2.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Id = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0].id
			: createRes1.CreateAccountResponse.account.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Account1 creates folder and grants access
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		const root1 = Array.isArray(getFolderRes1.GetFolderResponse.folder)
			? getFolderRes1.GetFolderResponse.folder[0]
			: getFolderRes1.GetFolderResponse.folder;
		const inbox1 = Array.isArray(root1.folder)
			? root1.folder.find(f => f.name === 'Inbox') : root1.folder;
		const folderName = `folder1${common.getUniqueString()}`;

		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox1.id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Account2 creates mountpoint
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		const root2 = Array.isArray(getFolderRes2.GetFolderResponse.folder)
			? getFolderRes2.GetFolderResponse.folder[0]
			: getFolderRes2.GetFolderResponse.folder;
		const inbox2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Inbox') : root2.folder;
		const sent2 = Array.isArray(root2.folder)
			? root2.folder.find(f => f.name === 'Sent') : root2.folder;

		const mountName = `folder1${common.getUniqueString()}`;
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link rid="${folderId}" zid="${account1Id}" l="${inbox2.id}"
					name="${mountName}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);
		const mountLink = Array.isArray(mountRes.CreateMountpointResponse.link)
			? mountRes.CreateMountpointResponse.link[0]
			: mountRes.CreateMountpointResponse.link;
		const mountId = mountLink.id;

		// Create filter and move mountpoint to Sent
		const subject = `test${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="Filter1${common.getUniqueString()}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is"
								value="${subject}"/>
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Inbox/${mountName}"/>
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, account2AuthToken
		);

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${mountId}" l="${sent2.id}"/>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(moveRes.Fault, 'FolderActionRequest should not fault');

		// Verify filter path was updated to Sent
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFilterRulesRequest xmlns="urn:zimbraMail"/>`, account2AuthToken
		);
		assert.notExists(filterRes.Fault, 'GetFilterRulesRequest should not fault');
	});
});
