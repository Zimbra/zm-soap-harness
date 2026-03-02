import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > Sync Gal Account Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let galAccountId;
	let galDsName;
	let serverName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create domain and gal sync account for tests
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts in domain
		const account1Email = `account${common.getUniqueString()}@${domainName}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create gal sync account
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		galDsName = `galaccount${common.getUniqueString()}`;
		// Get the server name from GetAllServersRequest
		const srvRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllServersRequest xmlns="urn:zimbraAdmin" service="mailbox"/>`, adminAuthToken
		);
		const servers = Array.isArray(srvRes.GetAllServersResponse.server)
			? srvRes.GetAllServersResponse.server : [srvRes.GetAllServersResponse.server];
		serverName = servers[0].name;

		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${galDsName}" type="zimbra" domain="${domainName}" server="${serverName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		galAccountId = galAcct.id;
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
	it('Smoke | Basic Test - Verify basic SyncGalAccountRequest', async () => {
		// Sync gal account by datasource name
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});


	it('Sanity | Verify basic SyncGalAccountRequest (by id)', async () => {
		// Get datasource ID
		const dsRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDataSourcesRequest xmlns="urn:zimbraAdmin">
				<id>${galAccountId}</id>
			</GetDataSourcesRequest>`, adminAuthToken
		);
		assert.notExists(dsRes.Fault, 'GetDataSourcesRequest should not fault');
		const dataSources = Array.isArray(dsRes.GetDataSourcesResponse.dataSource)
			? dsRes.GetDataSourcesResponse.dataSource : [dsRes.GetDataSourcesResponse.dataSource];
		const dsId = dataSources[0].id;
		assert.exists(dsId, 'Datasource ID should exist');

		// Sync by datasource ID
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="id">${dsId}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest by id should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});


	it('Smoke | Verify SyncGalAccountRequest (fullsync true)', async () => {
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest fullSync=true should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});


	it('Sanity | Verify SyncGalAccountRequest (fullsync false)', async () => {
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="false">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest fullSync=false should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});


	it('Sanity | Verify SyncGalAccountRequest (reset true)', async () => {
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" reset="false">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest reset should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});


	it('Sanity | Verify SyncGalAccountRequest with multiple gal accounts', async () => {
		// Create a second domain and gal sync account
		const domain2Name = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		const galAccount2Email = `galaccount${common.getUniqueString()}@${domain2Name}`;
		const galDs2Name = `galaccount${common.getUniqueString()}`;
		const galRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${galDs2Name}" type="zimbra" domain="${domain2Name}" server="${serverName}">
				<account by="name">${galAccount2Email}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes2.Fault, 'CreateGalSyncAccountRequest 2 should not fault');
		const galAcct2 = Array.isArray(galRes2.CreateGalSyncAccountResponse.account)
			? galRes2.CreateGalSyncAccountResponse.account[0] : galRes2.CreateGalSyncAccountResponse.account;
		const galAccount2Id = galAcct2.id;

		// Sync both gal accounts in one request
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name">${galDsName}</datasource>
				</account>
				<account id="${galAccount2Id}">
					<datasource by="name">${galDs2Name}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest with multiple accounts should not fault');
		assert.exists(syncRes.SyncGalAccountResponse, 'SyncGalAccountResponse should exist');
	});
});
