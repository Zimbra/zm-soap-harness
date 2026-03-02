import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Sharing > Outlook Permissions > Appointment Author', function () {
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


	it('Smoke | Outlook sharing perm', async () => {
		const a1 = await makeAcct('sh');
		const a2 = await makeAcct('sh');

		// Perform folder action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${a2.email}"
						perm="r"/>
				</action>
			</FolderActionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Outlook perm not fault');
	});


	it('Sanity | Outlook sharing rwidx', async () => {
		const a1 = await makeAcct('sh');
		const a2 = await makeAcct('sh');

		// Perform folder action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${a2.email}"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Outlook rwidx not fault');
	});
});
