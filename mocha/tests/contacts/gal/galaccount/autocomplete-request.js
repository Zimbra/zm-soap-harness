import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Contacts > GAL > GALAccount > AutoComplete > AutoCompleteRequest', function () {
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
	it('Smoke | AutoComplete in GAL account mode', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL account with partial name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>te</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete GAL account case insensitive', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>TEST</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});
});
