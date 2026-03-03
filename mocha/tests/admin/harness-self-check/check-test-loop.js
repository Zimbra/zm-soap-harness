import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Harness Self Check > Check Test Loop', function () {
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
	it('Functional | SOAP Harness - CheckTestLoop - Verify the required t - testloop attributes', async () => {
		// Equivalent of t:test_loop (single iteration)
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PingRequest should not fault');
	});

	it('Functional | SOAP Harness - CheckTestLoop - Verify the t - testloop count attribute', async () => {
		// Equivalent of t:test_loop count="10"
		for (let i = 0; i < 10; i++) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
			);
			assert.notExists(res.Fault, `PingRequest iteration ${i + 1} should not fault`);
		}
	});
});
