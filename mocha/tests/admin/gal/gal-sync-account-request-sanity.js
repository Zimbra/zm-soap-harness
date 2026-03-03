import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > GAL > Gal Sync Account Request Sanity', function () {
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
	it('Sanity | Test CreateGalSyncAccountRequest', async () => {
		// Create domain
		const domainName = `${common.getUniqueString()}.${config.testDomain}`;
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraGalMode">zimbra</a>
				<a n="zimbraGalMaxResults">100</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domRes.Fault, 'CreateDomainRequest should not fault');

		// Create gal sync account
		const galAccountEmail = `galaccount${common.getUniqueString()}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		assert.exists(galRes.CreateGalSyncAccountResponse.account, 'Account should exist in response');
	});


	it('Smoke | Test SyncGalAccountRequest', async () => {
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
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		const galAccountId = galAcct.id;

		// Sync gal account
		const syncRes = await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		assert.notExists(syncRes.Fault, 'SyncGalAccountRequest should not fault');
	});


	it('Smoke | Test DeleteGalSyncAccountRequest', async () => {
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
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${common.getUniqueString()}" type="zimbra" domain="${domainName}">
				<account by="name">${galAccountEmail}</account>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(galRes.Fault, 'CreateGalSyncAccountRequest should not fault');
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse.account;
		const galAccountId = galAcct.id;

		// Delete gal sync account
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteGalSyncAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${galAccountId}</account>
			</DeleteGalSyncAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteGalSyncAccountRequest should not fault');
	});
});
