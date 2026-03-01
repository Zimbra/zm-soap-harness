import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > ZCS-455 - GAL fix', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
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
	it('Smoke | ZCS-455 SearchGal validation', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>test</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});


	it('Sanity | ZCS-455 SearchGal with domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${config.testDomain}</name>
			</SearchGalRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.exists(res.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
