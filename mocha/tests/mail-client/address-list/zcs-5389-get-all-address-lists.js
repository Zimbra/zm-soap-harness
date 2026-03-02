import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Address List > ZCS 5389 Get All Address Lists', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let domain1Name, domain2Name, domain3Name;
	let account1Name, account2Name, account3Name;
	let al1Name, al2Name, al3Name, al4Name;
	let al1Id, al2Id, al3Id, al4Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const uid = common.getUniqueString();
		domain1Name = `testdomain1.${uid}.com`;
		domain2Name = `testdomain2.${uid}.com`;
		domain3Name = `testdomain3.${uid}.com`;
		account1Name = `test1${uid}@${domain1Name}`;
		account2Name = `test2${uid}@${domain2Name}`;
		account3Name = `test3${uid}@${domain3Name}`;
		al1Name = `al1_${uid}`;
		al2Name = `al2_${uid}`;
		al3Name = `al3_${uid}`;
		al4Name = `al4_${uid}`;
		const al1Desc = `al1_description_${uid}`;
		const al2Desc = `al2_description_${uid}`;
		const qaDept = 'QA';

		// Create domains
		for (const domainName of [domain1Name, domain2Name, domain3Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateDomainRequest xmlns="urn:zimbraAdmin">
					<name>${domainName}</name>
				</CreateDomainRequest>`, adminAuthToken
			);
		}

		// Create accounts
		for (const acctName of [account1Name, account2Name, account3Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}

		// Create address lists on domain1
		const createAlXml = (name, desc) => `<CreateAddressListRequest type="account" xmlns="urn:zimbraAdmin">
			<name>${name}</name>
			<desc>${desc}</desc>
			<searchFilter>
				<conds not="false" or="1">
					<conds />
					<cond not="false" attr="department" op="has" value="${qaDept}" />
				</conds>
			</searchFilter>
			<domain by="name">${domain1Name}</domain>
		</CreateAddressListRequest>`;

		let res = await soap.makeSOAPEnvelopeAdmin(createAlXml(al1Name, al1Desc), adminAuthToken);
		al1Id = res.CreateAddressListResponse?.id?._content || res.CreateAddressListResponse?.id;

		res = await soap.makeSOAPEnvelopeAdmin(createAlXml(al2Name, al2Desc), adminAuthToken);
		al2Id = res.CreateAddressListResponse?.id?._content || res.CreateAddressListResponse?.id;

		res = await soap.makeSOAPEnvelopeAdmin(createAlXml(al3Name, `al3_description_${uid}`), adminAuthToken);
		al3Id = res.CreateAddressListResponse?.id?._content || res.CreateAddressListResponse?.id;

		// Create AL4 on domain3
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAddressListRequest type="account" xmlns="urn:zimbraAdmin">
				<name>${al4Name}</name>
				<desc>al4_description_${uid}</desc>
				<searchFilter>
					<conds not="false" or="1">
						<conds />
						<cond not="false" attr="department" op="has" value="${qaDept}" />
					</conds>
				</searchFilter>
				<domain by="name">${domain3Name}</domain>
			</CreateAddressListRequest>`, adminAuthToken
		);
		al4Id = res.CreateAddressListResponse?.id?._content || res.CreateAddressListResponse?.id;
	});

	after(async function () {
		// Cleanup address lists
		for (const alId of [al1Id, al2Id, al3Id, al4Id]) {
			if (alId) {
				await soap.makeSOAPEnvelopeAdmin(
					`<DeleteAddressListRequest id="${alId}" xmlns="urn:zimbraAdmin"/>`, adminAuthToken
				);
			}
		}
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
	it.skip('Sanity | Create address lists', async () => {
		// Verify address lists were created successfully
		assert.exists(al1Id, 'Address list 1 should be created');
		assert.exists(al2Id, 'Address list 2 should be created');

		// Verify al3 on domain1 was created
		assert.exists(al3Id, 'Address list 3 should be created');

		// Verify al4 on domain3 was created
		assert.exists(al4Id, 'Address list 4 should be created');
	});


	it.skip('Sanity | GetAllAddressLists request on domain with valid ALs', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Name);

		// GetAllAddressListsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAllAddressListsRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetAllAddressListsResponse, 'GetAllAddressListsResponse should exist');

		const addressLists = res.GetAllAddressListsResponse?.addressLists;
		assert.exists(addressLists, 'addressLists should exist');

		const alArray = Array.isArray(addressLists?.addressList)
			? addressLists.addressList : addressLists?.addressList ? [addressLists.addressList] : [];

		// Verify al1 and al2 are returned
		const names = alArray.map(al => al.name);
		assert.include(names, al1Name, `Should contain ${al1Name}`);
		assert.include(names, al2Name, `Should contain ${al2Name}`);
	});


	it.skip('Sanity | GetAllAddressLists request on domain with no ALs', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account2Name);

		// GetAllAddressListsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAllAddressListsRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetAllAddressListsResponse, 'GetAllAddressListsResponse should exist');

		const addressLists = res.GetAllAddressListsResponse?.addressLists;
		const alArray = Array.isArray(addressLists?.addressList)
			? addressLists.addressList : addressLists?.addressList ? [addressLists.addressList] : [];

		// Verify no lists returned
		assert.equal(alArray.length, 0, 'Should have no address lists');
	});


	it.skip('Sanity | GetAllAddressLists request on domain with no active ALs', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account3Name);

		// GetAllAddressListsRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetAllAddressListsRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetAllAddressListsResponse, 'GetAllAddressListsResponse should exist');
	});
});
