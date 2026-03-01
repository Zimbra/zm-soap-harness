import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > GAL > SyncGalRequest Basic', function () {
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
	it('Smoke | SyncGalRequest basic sync', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});


	it('Sanity | SyncGalRequest with token from initial sync', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		const token = res1.SyncGalResponse.token;
		if (token) {
			const res2 = await soap.makeSOAPEnvelopeAccount(
				`<SyncGalRequest xmlns="urn:zimbraAccount" token="${token}"/>`, accountToken
			);
			assert.notExists(res2.Fault, 'SyncGal should not be a Fault');
			assert.exists(res2.SyncGalResponse, 'SyncGalResponse should exist');
		}
	});


	it('Sanity | SyncGalRequest returns more field', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SyncGalRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(res.Fault, 'SyncGal should not be a Fault');
		assert.exists(res.SyncGalResponse, 'SyncGalResponse should exist');
	});
});
