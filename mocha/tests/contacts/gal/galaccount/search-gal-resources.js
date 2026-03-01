import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Contacts > GAL > GALAccount > Resources > SearchGalRequest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | SearchGal resources request', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>*</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGal resources with name filter', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
