import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Invite Permissions > Get Permission Request Basic', function () {
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


	it('Smoke | GetPermission basic', async () => {
		const a1 = await makeAcct('perm');

		// Send get permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetPerm not fault');
	});


	it('Sanity | GetPermission after grant', async () => {
		const a1 = await makeAcct('perm');
		const a2 = await makeAcct('perm');

		// Send grant permission request
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
		);

		// Send get permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetPerm grant not fault');
	});


	it('Sanity | GetPermission sendAs', async () => {
		const a1 = await makeAcct('perm');

		// Send get permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendAs"/>
			</GetPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetPerm sendAs not fault');
	});


	it('Sanity | GetPermission all', async () => {
		const a1 = await makeAcct('perm');

		// Send get permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPermissionRequest xmlns="urn:zimbraMail"/>`,
			a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetPerm all not fault');
	});


	it('Sanity | GetPermission viewFreeBusy', async () => {
		const a1 = await makeAcct('perm');

		// Send get permission request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy"/>
			</GetPermissionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetPerm FB not fault');
	});


});
