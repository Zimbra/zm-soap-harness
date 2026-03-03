import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Harness Self Check > Check Finally', function () {
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

	after(async function () {
		// Equivalent of t:finally — run PingRequest after all tests
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | SOAP Harness - CheckTestLoop - Verify t - finally', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PingRequest should not fault');
	});
});
