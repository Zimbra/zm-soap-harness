import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Purge Calendar > Purge Account Calendar Cache Basic', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Send a basic PurgeAccountCalendarCacheRequest', async () => {
		// Create a test account
		const accountEmail = `test1.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = account.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = account.id;
		assert.exists(accountId, 'Account id should exist');

		// Purge account calendar cache
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeAccountCalendarCacheRequest id="${accountId}" xmlns="urn:zimbraAdmin">
			</PurgeAccountCalendarCacheRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(purgeRes.Fault, 'PurgeAccountCalendarCacheRequest should not fault');
	});
});
