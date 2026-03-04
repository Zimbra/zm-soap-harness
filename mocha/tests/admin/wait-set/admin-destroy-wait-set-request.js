import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Wait Set > Admin Destroy Wait Set Request', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | AdminDestroyWaitSetRequest', async () => {
		// Create a test account
		const accountEmail = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Create a wait set with allaccounts
		const wsRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminCreateWaitSetRequest xmlns="urn:zimbraAdmin" defTypes="all" allaccounts="1">
			</AdminCreateWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(wsRes.Fault, 'AdminCreateWaitSetRequest should not fault');
		const waitSetId = wsRes.AdminCreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.AdminCreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Destroy the wait set
		const destroyRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminDestroyWaitSetRequest waitSet="${waitSetId}" xmlns="urn:zimbraAdmin">
			</AdminDestroyWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(destroyRes.Fault, 'AdminDestroyWaitSetRequest should not fault');

		// Verify the wait set no longer exists by trying to use it
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}" seq="${waitSetSeq}" defTypes="all">
			</AdminWaitSetRequest>`, adminAuthToken, false
		);
		assert.isString(waitRes.Fault.Detail.Error.Code, 'AdminWaitSetRequest should fault for destroyed waitset');
		assert.include(waitRes.Fault.Detail.Error.Code, 'admin.NO_SUCH_WAITSET');
	});


	it('Sanity | AdminDestroyWaitSetRequest non existing waitset', async () => {
		// Try to destroy a non-existing wait set
		// XML test has no response validation - just sends the request
		const destroyRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminDestroyWaitSetRequest waitSet="sdfsdf" xmlns="urn:zimbraAdmin">
			</AdminDestroyWaitSetRequest>`, adminAuthToken, false
		);

		// The request completes - XML test does not validate the response
		assert.exists(destroyRes, 'Response should exist');
	});
});
