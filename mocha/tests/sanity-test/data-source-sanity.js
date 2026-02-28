import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('SanityTest > Data Source Sanity', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountAuthToken;
	let accountEmail, accountId;
	const testDomain = config.testDomain;
	const defaultPassword = config.defaultPassword;
	// POP3 settings - using the Zimbra server itself as POP3 host
	const pop3Host = config.serverHost;
	const pop3Port = '995';
	const pop3ConnectionType = 'ssl';

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account using framework helper
		accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const res = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, accountEmail, accountEmail
		);
		accountId = res.accountId;

		// Get account auth token
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Sanity test for CreateDataSourceRequest', async () => {
		// Get inbox folder id
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		assert.exists(res.GetFolderResponse, 'GetFolderResponse should exist');
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');

		// Verify response
		assert.exists(inbox, 'Inbox folder should exist');
		const parentFolderId = inbox.id;

		// Create folder for data source
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${accountEmail}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');
		assert.exists(res.CreateDataSourceResponse,
			'CreateDataSourceResponse should exist');
		assert.exists(res.CreateDataSourceResponse.pop3,
			'Response should contain pop3 data source');
	});


	it('Sanity | Sanity test for GetDataSourcesRequest', async () => {
		// Get inbox folder id
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const parentFolderId = inbox.id;

		// Create folder
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${accountEmail}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');
		const createdPop3Id = Array.isArray(res.CreateDataSourceResponse.pop3)
			? res.CreateDataSourceResponse.pop3[0].id
			: res.CreateDataSourceResponse.pop3.id;

		// GetDataSourcesRequest via admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetDataSourcesRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</GetDataSourcesRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetDataSourcesRequest should not fault');
		assert.exists(res.GetDataSourcesResponse,
			'GetDataSourcesResponse should exist');

		// Verify data source exists in response
		const dataSources = res.GetDataSourcesResponse.dataSource;
		if (dataSources) {
			const ds = Array.isArray(dataSources)
				? dataSources.find(d => d.name === pop3Name)
				: (dataSources.name === pop3Name ? dataSources : null);

			// Verify response
			assert.exists(ds, 'Should find the created data source');
			assert.equal(ds.id, createdPop3Id, 'Data source id should match');
		}
	});


	it('Sanity | Sanity test for ModifyDataSourceRequest', async () => {
		// Create a new account for this test
		const modifyAccount = `test.${common.getUniqueString()}@${testDomain}`;
		const modifyRes = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, modifyAccount, modifyAccount
		);
		const modifyAccountId = modifyRes.accountId;
		const modifyAuthToken = await soap.getAccountAuthToken(modifyAccount, config.accountPassword);

		// Get inbox folder
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', modifyAuthToken
		);
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const parentFolderId = inbox.id;

		// Create folder
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, modifyAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${modifyAccount}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, modifyAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');
		const createdPop3Id = Array.isArray(res.CreateDataSourceResponse.pop3)
			? res.CreateDataSourceResponse.pop3[0].id
			: res.CreateDataSourceResponse.pop3.id;

		// Modify data source via admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDataSourceRequest xmlns="urn:zimbraAdmin">
				<id>${modifyAccountId}</id>
				<dataSource id="${createdPop3Id}">
					<a n="zimbraDataSourceLeaveOnServer">FALSE</a>
				</dataSource>
			</ModifyDataSourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ModifyDataSourceRequest should not fault');
		assert.exists(res.ModifyDataSourceResponse,
			'ModifyDataSourceResponse should exist');
	});


	it('Sanity | Sanity test for DeleteDataSourceRequest', async () => {
		// Create a new account for this test
		const deleteAccount = `test.${common.getUniqueString()}@${testDomain}`;
		const deleteRes = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, deleteAccount, deleteAccount
		);
		const deleteAccountId = deleteRes.accountId;
		const deleteAuthToken = await soap.getAccountAuthToken(deleteAccount, config.accountPassword);

		// Get inbox folder
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', deleteAuthToken
		);
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const parentFolderId = inbox.id;

		// Create folder
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, deleteAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${deleteAccount}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, deleteAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');
		const createdPop3Id = Array.isArray(res.CreateDataSourceResponse.pop3)
			? res.CreateDataSourceResponse.pop3[0].id
			: res.CreateDataSourceResponse.pop3.id;

		// Delete data source via admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteDataSourceRequest xmlns="urn:zimbraAdmin">
				<id>${deleteAccountId}</id>
				<dataSource id="${createdPop3Id}">
				</dataSource>
			</DeleteDataSourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'DeleteDataSourceRequest should not fault');
		assert.exists(res.DeleteDataSourceResponse,
			'DeleteDataSourceResponse should exist');
	});


	it('Sanity | Sanity test for GetImportStatusRequest', async () => {
		// Get inbox folder
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const parentFolderId = inbox.id;

		// Create folder
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${accountEmail}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');
		const createdPop3Id = Array.isArray(res.CreateDataSourceResponse.pop3)
			? res.CreateDataSourceResponse.pop3[0].id
			: res.CreateDataSourceResponse.pop3.id;

		// ImportDataRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<ImportDataRequest xmlns="urn:zimbraMail">
				<pop3 id="${createdPop3Id}"/>
			</ImportDataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'ImportDataRequest should not fault');
		assert.exists(res.ImportDataResponse, 'ImportDataResponse should exist');

		// Wait briefly then check import status
		await new Promise(resolve => setTimeout(resolve, 1000));

		// GetImportStatusRequest
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetImportStatusRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetImportStatusRequest should not fault');
		assert.exists(res.GetImportStatusResponse,
			'GetImportStatusResponse should exist');
	});


	it('Sanity | Sanity test for TestDataSourceRequest', async () => {
		// Get inbox folder
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const parentFolderId = inbox.id;

		// Create folder
		const folderName = `folder.${common.getUniqueString()}`;

		// CreateFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${parentFolderId}"/>
			</CreateFolderRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest should not fault');
		const folderId = res.CreateFolderResponse.folder[0].id;

		// Create POP3 data source
		const pop3Name = `pop3name${common.getUniqueString()}`;
		const pop3Id = `pop3id${common.getUniqueString()}`;

		// CreateDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 id="${pop3Id}" name="${pop3Name}" isEnabled="true"
					host="${pop3Host}" port="${pop3Port}"
					username="${accountEmail}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</CreateDataSourceRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateDataSourceRequest should not fault');

		// TestDataSourceRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<TestDataSourceRequest xmlns="urn:zimbraMail">
				<pop3 isEnabled="true" host="${pop3Host}" port="${pop3Port}"
					username="${accountEmail}" password="${defaultPassword}"
					l="${folderId}" connectionType="${pop3ConnectionType}"
					leaveOnServer="true"/>
			</TestDataSourceRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'TestDataSourceRequest should not fault');
		assert.exists(res.TestDataSourceResponse,
			'TestDataSourceResponse should exist');
		const pop3Result = Array.isArray(res.TestDataSourceResponse.pop3)
			? res.TestDataSourceResponse.pop3[0]
			: res.TestDataSourceResponse.pop3;

		// Verify response
		assert.exists(pop3Result, 'Response should contain pop3 result');
		// success may be 0 or 1 depending on POP3 server accessibility
		assert.property(pop3Result, 'success',
			'pop3 result should have success property');
	});
});
