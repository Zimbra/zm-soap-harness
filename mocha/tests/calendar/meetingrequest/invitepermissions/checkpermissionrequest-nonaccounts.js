import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > InvitePermissions > CheckPermissionRequest-NonAccounts', function () {
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


	it('Sanity | CheckPermission non-account', async () => {
		const a1 = await makeAcct('perm');
		const res = await checkPerm(a1.token, a1.email, 'invite');

		// Verify response
		assert.notExists(res.Fault, 'Non-acct not fault');
	});


});
