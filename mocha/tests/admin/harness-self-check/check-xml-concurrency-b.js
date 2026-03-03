import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Harness Self Check > Check XML Concurrency B', function () {
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
	it('Functional | SOAP Harness - CheckTestCase - Verify the required t - testcase attributes', async () => {
		// First PingRequest
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res1.Fault, 'First PingRequest should not fault');

		// Delay equivalent (XML: t:delay sec="10")
		await soap.waitFor(10000);

		// Second PingRequest
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'Second PingRequest should not fault');
	});
});
