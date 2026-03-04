import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Data Source > Datasource Import', function () {
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
	it('Smoke | Basic CreateDataSourceRequest for IMAP', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const imapSourceEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${imapSourceEmail}</name>
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get inbox folder ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Create folder for data source
		const folderName = `imapsource${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;

		// Create IMAP data source
		const createDsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<imap name="${folderName}" isEnabled="TRUE" l="${folderId}"
				emailAddress="${imapSourceEmail}" username="${imapSourceEmail}" password="${config.accountPassword}"
				host="${config.serverHostName}" port="993" connectionType="ssl" leaveOnServer="TRUE"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);
		assert.notExists(createDsRes.Fault, 'CreateDataSourceRequest should not fault');
	});


	it('Sanity | Basic ImportDataRequest for POP', async () => {
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

		// Create folder for data source
		const folderName = `popsource${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const createdFolder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		assert.exists(createdFolder.id, 'folder id should exist');
	});


	it('Sanity | Basic ImportDataRequest for DSRC', async () => {
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

		// Create folder for data source
		const folderName = `dsrcsource${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
		const createdFolder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0] : createFolderRes.CreateFolderResponse.folder;
		assert.exists(createdFolder.id, 'folder id should exist');
	});


	it('Functional | ImportDataRequest with invalid data source ID', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const imapSourceEmail = `test.${common.getUniqueString()}@${testDomain}`;
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
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${imapSourceEmail}</name>
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
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create folder and data source
		const folderName = `imapinv${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const folderId = createFolderRes.CreateFolderResponse.folder[0].id;

		const createDsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<imap name="${folderName}" isEnabled="TRUE" l="${folderId}"
				emailAddress="${imapSourceEmail}" username="${imapSourceEmail}" password="${config.accountPassword}"
				host="${config.serverHostName}" port="993" connectionType="ssl" leaveOnServer="TRUE"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);
		assert.notExists(createDsRes.Fault, 'CreateDataSourceRequest should not fault');

		// Try to import with invalid ID
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportDataRequest xmlns="urn:zimbraMail">
				<imap id="invalidID123"/>
			</ImportDataRequest>`, accountAuthToken
		);
		assert.isString(importRes.Fault.Detail.Error.Code, 'ImportDataRequest with invalid ID should fault');
	});
});
