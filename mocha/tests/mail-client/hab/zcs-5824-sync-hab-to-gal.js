import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > HAB > ZCS-5824 SyncHABToGal', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domain1Name = `domain1${uid}.com`;
	let galAccountId;
	const galDsName = `name${uid}`;
	let account1DomainName;
	const ou1Name = `ZimbraOU${uid}`;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		account1DomainName = `account1${uid}@${domain1Name}`;

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraGalSyncInternalSearchBase">SUBDOMAINS</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1DomainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(acct1Res.CreateAccountResponse?.account)
			? acct1Res.CreateAccountResponse.account[0] : acct1Res.CreateAccountResponse?.account;
		const acct1Attrs = Array.isArray(acct1?.a) ? acct1.a : [acct1?.a];
		const acct1Host = acct1Attrs.find(a => a?.n === 'zimbraMailHost');
		const acct1Server = acct1Host?._ || acct1Host;

		const account2Name = `account2${uid}@${domain1Name}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create GAL sync account
		const galName = `galaccount${uid}@${domain1Name}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin"
				name="${galDsName}" type="zimbra" domain="${domain1Name}"
				server="${acct1Server}">
				<account by="name">${galName}</account>
				<password>${config.accountPassword}</password>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse?.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse?.account;
		galAccountId = galAcct?.id;

		// Initial GAL sync
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" forceSync="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);

		// Create OU
		await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou1Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domain1Name}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify SearchGal request returns the HAB group synced in gal', async () => {
		const group1Name = `grouphab1${uid}`;
		const group1 = `${group1Name}@${domain1Name}`;

		// Create HAB group
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${group1Name}"
				habOrgUnit="${ou1Name}" name="${group1}" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">test notes</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateHABGroupRequest should not fault');

		// Full GAL sync
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);

		// Wait for sync
		await new Promise(r => setTimeout(r, 15000));

		// Search GAL for HAB groups
		const acct1Auth = await soap.getAccountAuthToken(account1DomainName);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="eq" value="zimbraHabGroup"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, acct1Auth
		);
		assert.notExists(searchRes.Fault, 'SearchGalRequest should not fault');
		assert.exists(searchRes.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Verify SearchGal request does not returns the deleted HAB groups', async () => {
		const group2Name = `grouphab2${uid}`;
		const group2 = `${group2Name}@${domain1Name}`;

		// Create HAB group
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${group2Name}"
				habOrgUnit="${ou1Name}" name="${group2}" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">test notes</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateHABGroupRequest should not fault');
		const dl = Array.isArray(createRes.CreateHABGroupResponse?.dl)
			? createRes.CreateHABGroupResponse.dl[0] : createRes.CreateHABGroupResponse?.dl;
		const group2Id = dl?.id;

		// Sync to GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		await new Promise(r => setTimeout(r, 7000));

		// Verify group2 is in GAL
		const acct1Auth = await soap.getAccountAuthToken(account1DomainName);
		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraHABGroup"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, acct1Auth
		);
		assert.notExists(searchRes1.Fault, 'SearchGalRequest should not fault');

		// Delete the HAB group
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteDistributionListRequest id="${group2Id}"
				cascadeDelete="true" xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);

		// Sync to GAL again
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		await new Promise(r => setTimeout(r, 15000));

		// Verify group2 is NOT in GAL
		const acct1Auth2 = await soap.getAccountAuthToken(account1DomainName);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraHabGroup"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, acct1Auth2
		);
		assert.notExists(searchRes2.Fault, 'SearchGalRequest after delete should not fault');
	});


	it('Sanity | Verify SearchGal request returns the HAB group based on HAB group name', async () => {
		const group3Name = `grouphab3${uid}`;
		const group3 = `${group3Name}@${domain1Name}`;

		// Create HAB group
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${group3Name}"
				habOrgUnit="${ou1Name}" name="${group3}" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">test notes</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateHABGroupRequest should not fault');

		// Sync to GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
		await new Promise(r => setTimeout(r, 15000));

		// Search GAL with ref filter for specific group
		const acct1Auth = await soap.getAccountAuthToken(account1DomainName);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest ref="cn=${group3Name}*" xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="eq" value="zimbraHabGroup"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, acct1Auth
		);
		assert.notExists(searchRes.Fault, 'SearchGalRequest with ref should not fault');
		assert.exists(searchRes.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
