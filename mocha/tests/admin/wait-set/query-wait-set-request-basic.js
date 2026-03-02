import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Wait Set > Query Wait Set Request Basic', function () {
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
	it('Sanity | Verify that QueryWaitSetRequest returns valid account id of the waitset', async () => {
		// Create two test accounts
		const account1Email = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const create1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1.Fault, 'CreateAccountRequest 1 should not fault');
		const acct1 = Array.isArray(create1.CreateAccountResponse.account)
			? create1.CreateAccountResponse.account[0] : create1.CreateAccountResponse.account;
		const account1Id = acct1.id;

		const account2Email = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const create2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2.Fault, 'CreateAccountRequest 2 should not fault');
		const acct2 = Array.isArray(create2.CreateAccountResponse.account)
			? create2.CreateAccountResponse.account[0] : create2.CreateAccountResponse.account;
		const account2Id = acct2.id;

		// Create a wait set with both accounts
		const wsRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminCreateWaitSetRequest xmlns="urn:zimbraAdmin" defTypes="all">
				<add>
					<a id="${account1Id}"/>
					<a id="${account2Id}"/>
				</add>
			</AdminCreateWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(wsRes.Fault, 'AdminCreateWaitSetRequest should not fault');
		const waitSetId = wsRes.AdminCreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.AdminCreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Query the wait set
		const queryRes = await soap.makeSOAPEnvelopeAdmin(
			`<QueryWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}"/>`, adminAuthToken
		);
		assert.notExists(queryRes.Fault, 'QueryWaitSetRequest should not fault');
		assert.exists(queryRes.QueryWaitSetResponse, 'QueryWaitSetResponse should exist');

		// Verify waitset ID matches
		const ws = Array.isArray(queryRes.QueryWaitSetResponse.waitSet)
			? queryRes.QueryWaitSetResponse.waitSet[0] : queryRes.QueryWaitSetResponse.waitSet;
		assert.equal(ws.id, waitSetId, 'WaitSet ID should match');

		// Verify both account sessions exist
		const sessions = Array.isArray(ws.session) ? ws.session : [ws.session];
		const sessionIds = sessions.map(s => s.account);
		assert.include(sessionIds, account1Id, 'Account 1 should be in waitset sessions');
		assert.include(sessionIds, account2Id, 'Account 2 should be in waitset sessions');

		// Remove account2 from the wait set
		const removeRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}" seq="${waitSetSeq}">
				<remove>
					<a id="${account2Id}"/>
				</remove>
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(removeRes.Fault, 'AdminWaitSetRequest remove should not fault');
		assert.exists(removeRes.AdminWaitSetResponse, 'AdminWaitSetResponse should exist');

		// Query again — account2 should no longer be in sessions
		const queryRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<QueryWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}"/>`, adminAuthToken
		);
		assert.notExists(queryRes2.Fault, 'QueryWaitSetRequest 2 should not fault');
		const ws2 = Array.isArray(queryRes2.QueryWaitSetResponse.waitSet)
			? queryRes2.QueryWaitSetResponse.waitSet[0] : queryRes2.QueryWaitSetResponse.waitSet;
		assert.equal(ws2.id, waitSetId, 'WaitSet ID should still match');

		// Verify account1 still exists but account2 does not
		const sessions2 = ws2.session ? (Array.isArray(ws2.session) ? ws2.session : [ws2.session]) : [];
		const sessionIds2 = sessions2.map(s => s.account);
		assert.include(sessionIds2, account1Id, 'Account 1 should still be in sessions');
		assert.notInclude(sessionIds2, account2Id, 'Account 2 should not be in sessions after removal');
	});


	it('Regression | Verify QueryWaitSetRequest for invalid waitset id return error code', async () => {
		// Query with invalid waitset ID
		const queryRes = await soap.makeSOAPEnvelopeAdmin(
			`<QueryWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="#"/>`, adminAuthToken, false
		);
		assert.exists(queryRes.Fault, 'QueryWaitSetRequest should fault for invalid ID');
		assert.include(queryRes.Fault.Detail.Error.Code, 'admin.NO_SUCH_WAITSET');
	});
});
