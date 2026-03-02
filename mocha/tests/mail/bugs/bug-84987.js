import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 84987', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Unauthenticated REST freebusy html view access broken', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Get account info
		const accountInfoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAccountInfoRequest xmlns="urn:zimbraAccount">
				<account by="name">${accountEmail}</account>
			</GetAccountInfoRequest>`, authToken
		);
		assert.notExists(accountInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		assert.equal(accountInfoRes.GetAccountInfoResponse.name, accountEmail, 'Name should match');

		// Get info
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, authToken
		);
		assert.notExists(infoRes.Fault, 'GetInfoRequest should not fault');
		assert.exists(infoRes.GetInfoResponse.name || infoRes.GetInfoResponse.id,
			'GetInfoResponse should contain identity data');
	});
});
