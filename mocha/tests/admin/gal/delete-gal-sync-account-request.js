import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > Delete Gal Sync Account Request', function () {
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

	// Helper to create domain and gal sync account
	async function createDomainAndGalAccount() {
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const dsName = `name${common.getUniqueString()}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${dsName}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		return { domainName, galAccountEmail, galAccountId: galAcct.id, dsName };
	}

	// Tests
	it('Sanity | Basic test - delete a domain gal sync account (by name)', async () => {
		const { galAccountEmail } = await createDomainAndGalAccount();

		// Delete by name
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteGalSyncAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${galAccountEmail}</account>
			</DeleteGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteGalSyncAccountRequest by name should not fault');
		assert.exists(deleteRes.DeleteGalSyncAccountResponse, 'DeleteGalSyncAccountResponse should exist');
	});


	it('Sanity | Basic test - delete a domain gal sync account (by id)', async () => {
		const { galAccountId } = await createDomainAndGalAccount();

		// Delete by id
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteGalSyncAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${galAccountId}</account>
			</DeleteGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteGalSyncAccountRequest by id should not fault');
		assert.exists(deleteRes.DeleteGalSyncAccountResponse, 'DeleteGalSyncAccountResponse should exist');
	});


	it('Sanity | delete a domain gal sync account, then execute SyncGalAccountRequest', async () => {
		const { galAccountId, dsName } = await createDomainAndGalAccount();

		// Delete the gal sync account
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteGalSyncAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${galAccountId}</account>
			</DeleteGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteGalSyncAccountRequest should not fault');

		// Try to sync the deleted account — should fail
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name">${dsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken, false
		);
		assert.exists(syncRes.Fault, 'SyncGalAccountRequest should fault for deleted account');
		assert.include(syncRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});
});
