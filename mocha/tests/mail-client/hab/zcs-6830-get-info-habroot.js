import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Hab > ZCS 6830 Get Info Habroot', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domainName = `domain${uid}.com`;
	let domainId;
	let account2Name;
	let habGroup1Id, habGroup2Id;
	const ou1Name = `ZimbraOU${uid}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account2Name = `test2${uid}@${domainName}`;

		// Create domain
		const domRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">test of adding an OU</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		const dom = Array.isArray(domRes.CreateDomainResponse?.domain)
			? domRes.CreateDomainResponse.domain[0] : domRes.CreateDomainResponse?.domain;
		domainId = dom?.id;

		// Create accounts
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test1${uid}@${domainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create OU and groups
		await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou1Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);

		const g1Name = `grouphab1_${uid}`;
		const g2Name = `grouphab2_${uid}`;
		const g1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${g1Name}"
				habOrgUnit="${ou1Name}" name="${g1Name}@${domainName}" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">Group created notes</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		const dl1 = Array.isArray(g1Res.CreateHABGroupResponse?.dl)
			? g1Res.CreateHABGroupResponse.dl[0] : g1Res.CreateHABGroupResponse?.dl;
		habGroup1Id = dl1?.id;

		const g2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateHABGroupRequest habDisplayName="${g2Name}"
				habOrgUnit="${ou1Name}" name="${g2Name}@${domainName}" xmlns="urn:zimbraAdmin">
				<a n="zimbraNotes">Group created notes</a>
			</CreateHABGroupRequest>`, adminAuthToken
		);
		const dl2 = Array.isArray(g2Res.CreateHABGroupResponse?.dl)
			? g2Res.CreateHABGroupResponse.dl[0] : g2Res.CreateHABGroupResponse?.dl;
		habGroup2Id = dl2?.id;
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
	it('Sanity | Create OU and HAB groups for GetInfo HAB root testing', async () => {
		const t = await soap.getAccountAuthToken(account2Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Add a new HAB root to domain and verify in GetInfo roots returned', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domainId}</id>
				<a n="+zimbraHierarchicalAddressBookRoot">${habGroup1Id}</a>
				<a n="+zimbraHierarchicalAddressBookRoot">${habGroup2Id}</a>
			</ModifyDomainRequest>`, adminAuthToken
		);

		// Authenticate account
		const acct2Auth = await soap.getAccountAuthToken(account2Name);

		// Get info
		const getInfo = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct2Auth
		);

		// Verify response
		assert.notExists(getInfo.Fault, 'GetInfoRequest should not fault');
		assert.exists(getInfo.GetInfoResponse, 'GetInfoResponse should exist');
	});


	it('Sanity | Remove a HAB root from domain and verify it is not returned in GetInfo', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDomainRequest xmlns="urn:zimbraAdmin">
				<id>${domainId}</id>
				<a n="-zimbraHierarchicalAddressBookRoot">${habGroup1Id}</a>
			</ModifyDomainRequest>`, adminAuthToken
		);

		// Authenticate account
		const acct2Auth = await soap.getAccountAuthToken(account2Name);

		// Get info
		const getInfo = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, acct2Auth
		);

		// Verify response
		assert.notExists(getInfo.Fault, 'GetInfoRequest should not fault');
		assert.exists(getInfo.GetInfoResponse, 'GetInfoResponse should exist');
	});
});
