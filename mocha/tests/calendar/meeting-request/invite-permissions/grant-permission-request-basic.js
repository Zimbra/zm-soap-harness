import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Invite Permissions > Grant Permission Request Basic', function () {
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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


	it('Smoke | GrantPermission basic', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant not fault');
	});


	it('Sanity | GrantPermission sendAs', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendAs" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant sendAs not fault');
	});


	it('Sanity | GrantPermission sendOnBehalf', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendOnBehalfOf" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant SOB not fault');
	});


	it('Sanity | GrantPermission deny', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}" deny="1"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant deny not fault');
	});


	it('Sanity | GrantPermission viewFreeBusy', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant FB not fault');
	});


	it('Sanity | GrantPermission public', async () => {
		const a1 = await makeAcct('perm');

		// Send grant permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Grant pub not fault');
	});
});
