import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > AddressList > ZCS-5849 Sync AL to GAL', function () {
	this.timeout(180 * 1000);
	let adminAuthToken;
	let domain1Name, account1Name, galAccountName, galAccountId, galDsName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const uid = common.getUniqueString();
		domain1Name = `domain1${uid}.com`;
		galAccountName = `galaccount${uid}@${domain1Name}`;
		galDsName = `name${uid}`;
		account1Name = `account1${uid}@${domain1Name}`;
		const account2Name = `account2${uid}@${domain1Name}`;
		const defaultAccount = `user1_${uid}@${config.testDomain}`;

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${defaultAccount}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct2 = Array.isArray(acct2Res.CreateAccountResponse?.account)
			? acct2Res.CreateAccountResponse.account[0] : acct2Res.CreateAccountResponse?.account;
		const acct2Attrs = Array.isArray(acct2?.a) ? acct2.a : (acct2?.a ? [acct2.a] : []);
		const acct2Server = acct2Attrs.find(a => a.n === 'zimbraMailHost')?._content || acct2Attrs.find(a => a.n === 'zimbraMailHost');

		// Create GAL sync account
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="${galDsName}" type="zimbra" domain="${domain1Name}" server="${acct2Server}">
				<account by="name">${galAccountName}</account>
				<password>${config.accountPassword}</password>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);
		const galAcct = Array.isArray(galRes.CreateGalSyncAccountResponse?.account)
			? galRes.CreateGalSyncAccountResponse.account[0] : galRes.CreateGalSyncAccountResponse?.account;
		galAccountId = galAcct?.id;

		// Sync GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" forceSync="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);
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

	// Helper: create address list, sync GAL, and return AL id
	async function createAlAndSync(alName) {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAddressListRequest type="account" xmlns="urn:zimbraAdmin">
				<name>${alName}</name>
				<desc>Test address list</desc>
				<searchFilter>
					<conds not="false" or="1">
						<conds />
						<cond not="false" attr="department" op="has" value="QA" />
					</conds>
				</searchFilter>
				<domain by="name">${domain1Name}</domain>
			</CreateAddressListRequest>`, adminAuthToken
		);
		const alId = res.CreateAddressListResponse?.id?._content || res.CreateAddressListResponse?.id;

		// Sync GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);

		return alId;
	}

	// Tests
	it('Sanity | SearchGal returns address list synced in GAL', async () => {
		const alName = `addressList1_${common.getUniqueString()}`;
		await createAlAndSync(alName);

		const accountAuthToken = await soap.getAccountAuthToken(account1Name);
		await common.delay(10000);

		// SearchGalRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraAddressList"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGal does not return deleted address list', async () => {
		const alName = `addressList2_${common.getUniqueString()}`;
		const alId = await createAlAndSync(alName);

		let accountAuthToken = await soap.getAccountAuthToken(account1Name);
		await common.delay(7000);

		// Verify AL exists in GAL
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraAddressList"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');

		// Delete the AL
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAddressListRequest id="${alId}" xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);

		// Re-sync GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);

		accountAuthToken = await soap.getAccountAuthToken(account1Name);
		await common.delay(10000);

		// SearchGalRequest - deleted AL should not appear
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraAddressList"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGal returns address list based on name', async () => {
		const alName = `addressList3_${common.getUniqueString()}`;
		await createAlAndSync(alName);

		const accountAuthToken = await soap.getAccountAuthToken(account1Name);
		await common.delay(10000);

		// SearchGalRequest filtered by name
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest ref="uid=addressList3*" xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraAddressList"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | Modified address list gets synced to GAL', async () => {
		const alName = `addressList4_${common.getUniqueString()}`;
		const alId = await createAlAndSync(alName);
		const modAlName = `mod_addressList4_${common.getUniqueString()}`;

		// Modify address list
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAddressListRequest type="all" id="${alId}" xmlns="urn:zimbraAdmin">
				<name>${modAlName}</name>
				<desc>Test address list</desc>
				<searchFilter>
					<conds not="false" or="1">
						<cond not="false" attr="jobTitle" op="eq" value="Manager" />
					</conds>
				</searchFilter>
			</ModifyAddressListRequest>`, adminAuthToken
		);

		// Re-sync GAL
		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
				<account id="${galAccountId}">
					<datasource by="name" fullSync="true" reset="true">${galDsName}</datasource>
				</account>
			</SyncGalAccountRequest>`, adminAuthToken
		);

		const accountAuthToken = await soap.getAccountAuthToken(account1Name);
		await common.delay(10000);

		// SearchGalRequest for modified AL
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest ref="uid=mod_addressList4*" xmlns="urn:zimbraAccount" name="" type="all">
				<searchFilter>
					<conds>
						<cond attr="objectClass" op="has" value="zimbraAddressList"/>
					</conds>
				</searchFilter>
			</SearchGalRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
