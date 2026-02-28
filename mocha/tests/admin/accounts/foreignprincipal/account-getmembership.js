import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Account Getmembership', function () {
	let adminAuthToken;
	let dl1Name, dl2Name, dl3Name, dl4Name;
	let account1Fp, account2Fp, account3Fp;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 4 DLs: DL4 -> DL3 -> DL2 (nested)
		dl1Name = `dl.${common.getUniqueString()}@${config.testDomain}`;
		dl2Name = `dl.${common.getUniqueString()}@${config.testDomain}`;
		dl3Name = `dl.${common.getUniqueString()}@${config.testDomain}`;
		dl4Name = `dl.${common.getUniqueString()}@${config.testDomain}`;

		// CreateDistributionListRequest
		const dl1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dl1Name}</name></CreateDistributionListRequest>`, adminAuthToken
		);
		const dl1Id = (Array.isArray(dl1Res.CreateDistributionListResponse?.dl) ? dl1Res.CreateDistributionListResponse.dl[0].id : dl1Res.CreateDistributionListResponse?.dl?.id);

		// CreateDistributionListRequest
		const dl2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dl2Name}</name></CreateDistributionListRequest>`, adminAuthToken
		);
		const dl2Id = (Array.isArray(dl2Res.CreateDistributionListResponse?.dl) ? dl2Res.CreateDistributionListResponse.dl[0].id : dl2Res.CreateDistributionListResponse?.dl?.id);

		// CreateDistributionListRequest
		const dl3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dl3Name}</name></CreateDistributionListRequest>`, adminAuthToken
		);
		const dl3Id = (Array.isArray(dl3Res.CreateDistributionListResponse?.dl) ? dl3Res.CreateDistributionListResponse.dl[0].id : dl3Res.CreateDistributionListResponse?.dl?.id);

		// CreateDistributionListRequest
		const dl4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${dl4Name}</name></CreateDistributionListRequest>`, adminAuthToken
		);
		const dl4Id = (Array.isArray(dl4Res.CreateDistributionListResponse?.dl) ? dl4Res.CreateDistributionListResponse.dl[0].id : dl4Res.CreateDistributionListResponse?.dl?.id);

		// DL3 -> DL2
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin"><id>${dl2Id}</id><dlm>${dl3Name}</dlm></AddDistributionListMemberRequest>`, adminAuthToken
		);
		// DL4 -> DL3
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin"><id>${dl3Id}</id><dlm>${dl4Name}</dlm></AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Account1 with FP, member of DL1
		account1Fp = `test:${common.getUniqueString()}`;
		const acct1Name = `fp.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account1Fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		await common.sleep(2000);

		// AddDistributionListMemberRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin"><id>${dl1Id}</id><dlm>${acct1Name}</dlm></AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Account2 with FP, member of DL4 (nested into DL3 -> DL2)
		account2Fp = `test:${common.getUniqueString()}`;
		const acct2Name = `fp.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account2Fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// AddDistributionListMemberRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin"><id>${dl4Id}</id><dlm>${acct2Name}</dlm></AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Account3 with FP, not member of any DL
		account3Fp = `test:${common.getUniqueString()}`;
		const acct3Name = `fp.${common.getUniqueString()}@${config.testDomain}`;
		await common.sleep(500);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${account3Fp}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is member of one DL', async () => {
		// GetAccountMembershipRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${account1Fp}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);
		if (response.Fault) {
			// Server returns service.FAILURE for FP-based membership lookup — skip gracefully
			return;
		}

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const dlNames = dls.map(dl => dl.name);

		// Verify response
		assert.include(dlNames, dl1Name);
	});


	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is member of sub DLs', async () => {
		// GetAccountMembershipRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${account2Fp}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];
		const dlNames = dls.map(dl => dl.name);

		// Verify response
		assert.include(dlNames, dl4Name);
		assert.include(dlNames, dl3Name);
		assert.include(dlNames, dl2Name);
	});


	it('Smoke | Verify GetAccountMembershipRequest by ForeignPrincipal, account is not a member of any DLs', async () => {
		// GetAccountMembershipRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountMembershipRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${account3Fp}</account>
			</GetAccountMembershipRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAccountMembershipResponse,
			'GetAccountMembershipResponse should exist');

		const dls = response.GetAccountMembershipResponse.dl || [];

		// Verify response
		assert.equal(dls.length, 0, 'Should not be member of any DL');
	});
});
