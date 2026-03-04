import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > ZCS 90', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Verify default value for zimbraPrefDefaultCalendarId', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Verify default calendar id via admin
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
	});


	it('Sanity | Set zimbraPrefDefaultCalendarId to non default value and verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a calendar folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="NewFolderInRoot" l="1" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const newFolderId = folderRes.CreateFolderResponse.folder[0].id;

		// Create sub-folder of default calendar
		const subRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="NewSubFolderInDefault" l="10" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(subRes.Fault, 'CreateFolderRequest sub should not fault');
		const subFolderId = subRes.CreateFolderResponse.folder[0].id;

		// Create sub-folder of new folder
		const subNewRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="NewSubFolderInNonDefault" l="${newFolderId}" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(subNewRes.Fault, 'CreateFolderRequest subNew should not fault');
		const createdFolder = Array.isArray(subNewRes.CreateFolderResponse.folder)
			? subNewRes.CreateFolderResponse.folder[0] : subNewRes.CreateFolderResponse.folder;
		assert.exists(createdFolder.id, 'folder id should exist');
	});


	it('Sanity | Share and mount calendars for tests', async () => {
		// Create accounts
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccountRequest 1 should not fault');
		const account2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(account2Res.Fault, 'CreateAccountRequest 2 should not fault');
		assert.exists(account2Res.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = account2Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const account2Id = account2Res.CreateAccountResponse.account[0].id;
		const host2 = account2Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Share calendar from account2 to account1
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${account1Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);
		assert.notExists(grantRes.Fault, 'FolderActionRequest grant should not fault');

		// Mount shared calendar
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="10" name="Calendar.${account2Email}" view="appointment" rid="10" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
	});


	it('Sanity | Set sub calendar of root calendar as default and verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create sub-folder
		const subRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}" l="10" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(subRes.Fault, 'CreateFolderRequest should not fault');
		const subFolderId = subRes.CreateFolderResponse.folder[0].id;

		// Set as default
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${subFolderId}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Set new calendar as default and verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create new calendar folder in root
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="NewCal${common.getUniqueString()}" l="1" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const newCalId = folderRes.CreateFolderResponse.folder[0].id;

		// Set as default
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${newCalId}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Set sub calendar of new calendar as default and verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create new calendar folder in root
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="NewCal${common.getUniqueString()}" l="1" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const newCalId = folderRes.CreateFolderResponse.folder[0].id;

		// Create sub-folder of new calendar
		const subRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubOfNew${common.getUniqueString()}" l="${newCalId}" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(subRes.Fault, 'CreateFolderRequest sub should not fault');
		const subCalId = subRes.CreateFolderResponse.folder[0].id;

		// Set sub as default
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${subCalId}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Sanity | Shared calendar with viewer right cannot be set as default', async () => {
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
		const account2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account2Id = account2Res.CreateAccountResponse.account[0].id;
		const host2 = account2Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Share with viewer rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${account1Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account2AuthToken
		);

		// Mount
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="10" name="Calendar.${account2Email}" view="appointment" rid="10" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const sharedCalId = mountRes.CreateMountpointResponse.link[0].id;

		// Try to set shared viewer calendar as default - should fail
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${sharedCalId}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.isString(modRes.Fault.Detail.Error.Code, 'Setting viewer-shared calendar as default should fault');
	});


	it('Sanity | Shared calendar with manager right can be set as default', async () => {
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
		const account3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account3Id = account3Res.CreateAccountResponse.account[0].id;
		const host2 = account3Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		// Share with manager rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${account1Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account3AuthToken
		);

		// Mount
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="10" name="Calendar.${account3Email}" view="appointment" rid="10" zid="${account3Id}"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const sharedCalId = mountRes.CreateMountpointResponse.link[0].id;

		// Set shared manager calendar as default - should succeed
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${sharedCalId}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'Setting manager-shared calendar as default should not fault');
	});


	it('Sanity | Shared calendar with admin right can be set as default', async () => {
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account4Email = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
		const account4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account4Id = account4Res.CreateAccountResponse.account[0].id;
		const host2 = account4Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		// Share with admin rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${account1Email}" perm="rwidxa"/>
				</action>
			</FolderActionRequest>`, account4AuthToken
		);

		// Mount
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="10" name="Calendar.${account4Email}" view="appointment" rid="10" zid="${account4Id}"/>
			</CreateMountpointRequest>`, account1AuthToken
		);
		assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
		const sharedCalId = mountRes.CreateMountpointResponse.link[0].id;

		// Set shared admin calendar as default - should succeed
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${sharedCalId}</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'Setting admin-shared calendar as default should not fault');
	});


	it('Sanity | Delete default calendar and verify default resets', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create new calendar
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="TempCal${common.getUniqueString()}" l="1" view="appointment"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolderRequest should not fault');
		const newCalId = folderRes.CreateFolderResponse.folder[0].id;

		// Set as default
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">${newCalId}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Delete the calendar
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${newCalId}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(delRes.Fault, 'FolderActionRequest delete should not fault');
		const folderAction = Array.isArray(delRes.FolderActionResponse.action)
			? delRes.FolderActionResponse.action[0] : delRes.FolderActionResponse.action;
		assert.equal(folderAction.op, 'delete', 'op should be delete');
	});


	it('Sanity | Modify zimbraPrefDefaultCalendarId at COS level', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set default calendar id
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDefaultCalendarId">10</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
	});
});
