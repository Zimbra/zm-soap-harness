import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Invite Permissions > Check Permission Request Basic', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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

	async function makeAcct(prefix) {
		const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const token = await soap.getAccountAuthToken(email);
		return { email, token };
	}

	async function checkPerm(callerToken, targetEmail, right) {
		return soap.makeSOAPEnvelopeAccount(
			`<CheckPermissionRequest xmlns="urn:zimbraMail">
				<target type="account" by="name">
					${targetEmail}
				</target>
				<right>${right}</right>
			</CheckPermissionRequest>`, callerToken
		);
	}


	it('Smoke | CheckPermission basic', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');
		const res = await checkPerm(a1.token, a2.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'CheckPerm not fault');
	});


	it('Sanity | CheckPermission self', async () => {
		const a1 = await makeAcct('perm');
		const res = await checkPerm(a1.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'Self check not fault');
	});


	it('Sanity | CheckPermission sendAs', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');
		const res = await checkPerm(a1.token, a2.email, 'sendAs');

		// Verify response
		assert.notExists(res.Fault, 'SendAs check not fault');
	});


	it('Sanity | CheckPermission sendOnBehalfOf', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');
		const res = await checkPerm(
			a1.token, a2.email, 'sendOnBehalfOf'
		);

		// Verify response
		assert.notExists(res.Fault, 'SendOnBehalf not fault');
	});


	it('Sanity | CheckPermission multiple rights', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send check permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckPermissionRequest xmlns="urn:zimbraMail">
				<target type="account" by="name">
					${a2.email}
				</target>
				<right>invite</right>
				<right>sendAs</right>
			</CheckPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Multi rights not fault');
	});


	it('Sanity | CheckPermission three accounts', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');
		const a3 = await makeAcct('perm');
		const r1 = await checkPerm(a1.token, a2.email, 'invite');
		const r2 = await checkPerm(a1.token, a3.email, 'invite');

		// Verify response
		assert.notExists(r1.Fault, 'Check a2 not fault');
		assert.notExists(r2.Fault, 'Check a3 not fault');
	});


});
