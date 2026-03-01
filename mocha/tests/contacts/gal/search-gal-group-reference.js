import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > GAL > SearchGal Group Reference', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let dlName;

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

		dlName = `dl${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | SearchGal with group reference', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGal verify DL in results', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="all">
				<name>dl</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | SearchGal with type group', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="group">
				<name>dl</name>
			</SearchGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
