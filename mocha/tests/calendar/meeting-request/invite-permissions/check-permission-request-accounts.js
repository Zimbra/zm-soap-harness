import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Invite Permissions > Check Permission Request Accounts', function () {
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


	it('Smoke | CheckPermission resource', async () => {
		const a1 = await makeAcct('perm');
		const res = await checkPerm(a1.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'Resource perm not fault');
	});


	it('Sanity | CheckPermission viewFreeBusy', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');
		const res = await checkPerm(
			a1.token, a2.email, 'viewFreeBusy'
		);

		// Verify response
		assert.notExists(res.Fault, 'ViewFB not fault');
	});


	it('Sanity | CheckPermission after grant', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);
		const res = await checkPerm(a2.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'After grant not fault');
	});


	it('Sanity | CheckPermission deny', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}" deny="1"/>
			</GrantPermissionRequest>`, a1.token
		);
		const res = await checkPerm(a2.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'Deny check not fault');
	});


	it('Sanity | CheckPermission revoke', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Send revoke permission request
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</RevokePermissionRequest>`, a1.token
		);
		const res = await checkPerm(a2.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'Revoke check not fault');
	});

});
