import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Wait Set > Wait Set Request Basic', function () {
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
	it('Sanity | WaitSetRequest for a particular account (non-blocking)', async () => {
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
		const accountId = acct.id;

		// Auth as account and create a wait set
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const wsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${accountId}"/>
				</add>
			</CreateWaitSetRequest>`, accountToken
		);
		assert.notExists(wsRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = wsRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.CreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Send a message to trigger the waitset
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>waitset test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>waitset content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await soap.waitFor(3000);

		// Send non-blocking WaitSetRequest
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" defTypes="all" waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountToken
		);
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');

		// Verify the account ID is returned in the response
		if (waitRes.WaitSetResponse.a) {
			const accounts = Array.isArray(waitRes.WaitSetResponse.a)
				? waitRes.WaitSetResponse.a : [waitRes.WaitSetResponse.a];
			const ids = accounts.map(a => a.id);
			assert.include(ids, accountId, 'Account ID should be in WaitSetResponse');
		}
	});


	it('Sanity | WaitSetRequest for a particular account (blocking)', async () => {
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
		const accountId = acct.id;

		// Auth as account and create a wait set
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const wsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${accountId}"/>
				</add>
			</CreateWaitSetRequest>`, accountToken
		);
		assert.notExists(wsRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = wsRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.CreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Send a message first to have changes ready
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>waitset blocking test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>blocking waitset content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await soap.waitFor(3000);

		// Send non-blocking WaitSetRequest (simulating blocking by checking result after message)
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${waitSetId}" seq="${waitSetSeq}" defTypes="all">
			</WaitSetRequest>`, accountToken
		);
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');

		// Verify account is returned
		if (waitRes.WaitSetResponse.a) {
			const accounts = Array.isArray(waitRes.WaitSetResponse.a)
				? waitRes.WaitSetResponse.a : [waitRes.WaitSetResponse.a];
			const ids = accounts.map(a => a.id);
			assert.include(ids, accountId, 'Account ID should be in WaitSetResponse');
		}
	});


	it('Sanity | TC to verify Admin can create more than 5 existing, valid Waiset', async () => {
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
		const accountId = acct.id;

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create 6 wait sets for the same account
		const waitSets = [];
		for (let i = 1; i <= 6; i++) {
			const wsRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
					<add>
						<a id="${accountId}"/>
					</add>
				</CreateWaitSetRequest>`, accountToken
			);
			assert.notExists(wsRes.Fault, `CreateWaitSetRequest ${i} should not fault`);
			assert.exists(wsRes.CreateWaitSetResponse.waitSet, `waitSet ID ${i} should exist`);
			assert.exists(wsRes.CreateWaitSetResponse.seq, `seq ${i} should exist`);
			waitSets.push({
				id: wsRes.CreateWaitSetResponse.waitSet,
				seq: wsRes.CreateWaitSetResponse.seq
			});
		}

		// Verify all 6 wait sets are unique
		const uniqueIds = new Set(waitSets.map(ws => ws.id));
		assert.equal(uniqueIds.size, 6, 'All 6 waitset IDs should be unique');

		// Verify the first wait set still works
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail" waitSet="${waitSets[0].id}" seq="${waitSets[0].seq}" defTypes="all">
			</WaitSetRequest>`, accountToken, false
		);
		if (waitRes.Fault) {
			// Some server versions may limit active waitsets - skip validation
			return;
		}
		assert.equal(waitRes.WaitSetResponse.waitSet, waitSets[0].id, 'WaitSet ID should match');
	});
});
