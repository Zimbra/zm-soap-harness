import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Attachment-Identity', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Functional | Create identity with attachment settings', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `attach${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Attachment Display</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});
});
