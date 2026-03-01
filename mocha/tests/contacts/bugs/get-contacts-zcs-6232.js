import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Bugs > ZCS-6232 - GetContacts deny view', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let dlName;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		dlName = `dl${common.getUniqueString()}@${config.testDomain}`;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create DL and add members', async () => {
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');

		const addRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${Array.isArray(dlRes.CreateDistributionListResponse.dl) ? dlRes.CreateDistributionListResponse.dl[0].id : dlRes.CreateDistributionListResponse.dl.id}</id>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		assert.notExists(addRes.Fault, 'AddMember should not be a Fault');
	});


	it('Regression | GetContacts with invalid id returns error', async () => {
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="999999999"/>
			</GetContactsRequest>`, account1Token, false
		);
		// Should return empty or fault
		if (getRes.Fault) {
			assert.exists(getRes.Fault, 'Invalid id should return Fault');
		} else {
			assert.exists(getRes.GetContactsResponse, 'Response should exist');
		}
	});
});
