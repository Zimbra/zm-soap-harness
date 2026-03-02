import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > Add Gal Sync Data Source Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

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
	it('Smoke | Basic test: Add Gal Sync data source to gal sync account', async () => {
		// Create domain
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create gal sync account
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const ds1Name = `datasource${common.getUniqueString()}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${ds1Name}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		const galAccountId = galAcct.id;

		// Add another data source
		const ds2Name = `ds${common.getUniqueString()}`;
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${ds2Name}" type="zimbra" domain="${domainName}" server="${config.zimbraServer}" folder="${ds2Name}">
				<account by="name">${galAccountEmail}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken
		);
		assert.notExists(addRes.Fault, 'AddGalSyncDataSourceRequest should not fault');
		assert.exists(addRes.AddGalSyncDataSourceResponse, 'AddGalSyncDataSourceResponse should exist');
		const addAcct = Array.isArray(addRes.AddGalSyncDataSourceResponse.account)
			? addRes.AddGalSyncDataSourceResponse.account[0] : addRes.AddGalSyncDataSourceResponse.account;
		assert.equal(addAcct.id, galAccountId, 'Account ID should match');

		// Verify data sources
		const dsRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDataSourcesRequest xmlns="urn:zimbraAdmin">
				<id>${galAccountId}</id>
			</GetDataSourcesRequest>`, adminAuthToken
		);
		assert.notExists(dsRes.Fault, 'GetDataSourcesRequest should not fault');
		const dataSources = Array.isArray(dsRes.GetDataSourcesResponse.dataSource)
			? dsRes.GetDataSourcesResponse.dataSource : [dsRes.GetDataSourcesResponse.dataSource];
		const dsNames = dataSources.map(ds => ds.name);
		assert.include(dsNames, ds1Name, 'First data source should exist');
		assert.include(dsNames, ds2Name, 'Second data source should exist');
	});


	it('Smoke | Basic test - Add ldap and zimbra datasource to gal sync account', async () => {
		// Create domain
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create gal sync account
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const ds1Name = `datasource1${common.getUniqueString()}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${ds1Name}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		const galAccountId = galAcct.id;

		// Add LDAP data source
		const ds2Name = `datasource2${common.getUniqueString()}`;
		const addLdap = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${ds2Name}" type="ldap" domain="${domainName}" server="${config.zimbraServer}" folder="${ds2Name}">
				<account by="id">${galAccountId}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken
		);
		assert.notExists(addLdap.Fault, 'AddGalSyncDataSourceRequest ldap should not fault');
		assert.equal(addLdap.AddGalSyncDataSourceResponse.account.id || addLdap.AddGalSyncDataSourceResponse.account[0].id, galAccountId);

		// Add zimbra data source
		const ds3Name = `datasource3${common.getUniqueString()}`;
		const addZimbra = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${ds3Name}" type="zimbra" domain="${domainName}" server="${config.zimbraServer}" folder="${ds3Name}">
				<account by="id">${galAccountId}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken
		);
		assert.notExists(addZimbra.Fault, 'AddGalSyncDataSourceRequest zimbra should not fault');

		// Verify all 3 data sources exist
		const dsRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDataSourcesRequest xmlns="urn:zimbraAdmin">
				<id>${galAccountId}</id>
			</GetDataSourcesRequest>`, adminAuthToken
		);
		assert.notExists(dsRes.Fault, 'GetDataSourcesRequest should not fault');
		const dataSources = Array.isArray(dsRes.GetDataSourcesResponse.dataSource)
			? dsRes.GetDataSourcesResponse.dataSource : [dsRes.GetDataSourcesResponse.dataSource];
		const dsNames = dataSources.map(ds => ds.name);
		assert.include(dsNames, ds1Name, 'First data source should exist');
		assert.include(dsNames, ds2Name, 'LDAP data source should exist');
		assert.include(dsNames, ds3Name, 'Zimbra data source should exist');
	});


	it('Sanity | Basic test: Add Gal Sync data source to non existing gal sync account', async () => {
		// Create domain with ldap mode
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">ldap</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Try to add data source to non-existing account
		const nxAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const dsName = `datasource${common.getUniqueString()}`;
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${dsName}" type="ldap" domain="${domainName}" server="${config.zimbraServer}" folder="${dsName}">
				<account by="name">${nxAccountEmail}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken, false
		);
		assert.exists(addRes.Fault, 'AddGalSyncDataSourceRequest should fault for non-existing account');
		assert.include(addRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Sanity | Basic test: Add Gal Sync data source to non existing domain', async () => {
		// Try to add data source to non-existing domain
		const nxDomainName = `${common.getUniqueString()}.${config.testDomain}`;
		const nxAccountEmail = `galaccount${common.getUniqueString()}@${nxDomainName}`;
		const dsName = `datasource${common.getUniqueString()}`;
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${dsName}" type="ldap" domain="${nxDomainName}" server="${config.zimbraServer}" folder="${dsName}">
				<account by="name">${nxAccountEmail}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken, false
		);
		assert.exists(addRes.Fault, 'AddGalSyncDataSourceRequest should fault for non-existing domain');
		assert.include(addRes.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN');
	});


	it('Sanity | Basic test: Add Gal Sync data source to normal account', async () => {
		// Create domain
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create normal account (not gal sync)
		const accountEmail = `account${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Add data source to normal account
		const dsName = `datasource${common.getUniqueString()}`;
		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddGalSyncDataSourceRequest xmlns="urn:zimbraAdmin" name="${dsName}" type="zimbra" domain="${domainName}" server="${config.zimbraServer}" folder="${dsName}">
				<account by="name">${accountEmail}</account>
			</AddGalSyncDataSourceRequest>`, adminAuthToken
		);
		assert.notExists(addRes.Fault, 'AddGalSyncDataSourceRequest on normal account should not fault');
		const addAcct = Array.isArray(addRes.AddGalSyncDataSourceResponse.account)
			? addRes.AddGalSyncDataSourceResponse.account[0] : addRes.AddGalSyncDataSourceResponse.account;
		assert.equal(addAcct.id, accountId, 'Account ID should match');

		// Verify data source exists
		const dsRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDataSourcesRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</GetDataSourcesRequest>`, adminAuthToken
		);
		assert.notExists(dsRes.Fault, 'GetDataSourcesRequest should not fault');
		const dataSources = Array.isArray(dsRes.GetDataSourcesResponse.dataSource)
			? dsRes.GetDataSourcesResponse.dataSource : [dsRes.GetDataSourcesResponse.dataSource];
		const dsNames = dataSources.map(ds => ds.name);
		assert.include(dsNames, dsName, 'Data source should exist');
	});
});
