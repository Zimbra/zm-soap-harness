import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Get All Admin Accounts', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Test for GetAllAdminAccountsRequest', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllAdminAccountsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.GetAllAdminAccountsResponse,
			'GetAllAdminAccountsResponse should exist');
	});
});
