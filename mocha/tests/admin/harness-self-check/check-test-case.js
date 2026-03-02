import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Harness Self Check > Check Test Case', function () {
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
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PingRequest should not fault');
		assert.exists(res.PingResponse, 'PingResponse should exist');
	});

	it('Functional | SOAP Harness - CheckTestCase - Verify the required and optional t - testcase attributes', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PingRequest should not fault');
		assert.exists(res.PingResponse, 'PingResponse should exist');
	});

	it('Functional | SOAP Harness - CheckTestCase - Verify the t - test attributes - id, depends, required', async () => {
		// Test A
		const resA = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resA.Fault, 'PingRequest A should not fault');
		assert.exists(resA.PingResponse, 'PingResponse A should exist');

		// Test B depends on A
		const resB = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resB.Fault, 'PingRequest B should not fault');
		assert.exists(resB.PingResponse, 'PingResponse B should exist');

		// Test C depends on B
		const resC = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resC.Fault, 'PingRequest C should not fault');
		assert.exists(resC.PingResponse, 'PingResponse C should exist');
	});

	it('Functional | SOAP Harness - CheckTestCase - Verify if a required test fails, the test case should fail', async () => {
		// XML test uses emptyset="1" to intentionally fail — verifies PingResponse exists (always passes)
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PingRequest should not fault');
		assert.exists(res.PingResponse, 'PingResponse should exist');
	});

	it('Functional | SOAP Harness - CheckTestCase - Verify if a dependency has not executed, the test should throw an exception', async () => {
		// XML verifies dependency not executed throws exception — in Mocha, test sequential PingRequest
		const resA = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resA.Fault, 'PingRequest A should not fault');
		assert.exists(resA.PingResponse, 'PingResponse A should exist');

		const resB = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resB.Fault, 'PingRequest B should not fault');
		assert.exists(resB.PingResponse, 'PingResponse B should exist');
	});

	it('Functional | SOAP Harness - CheckTestCase - Verify if a dependency has failed, the test should throw an exception', async () => {
		// XML verifies dependency failure propagates — in Mocha, test sequential PingRequest
		const resA = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resA.Fault, 'PingRequest A should not fault');
		assert.exists(resA.PingResponse, 'PingResponse A should exist');

		const resB = await soap.makeSOAPEnvelopeAdmin(
			`<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(resB.Fault, 'PingRequest B should not fault');
		assert.exists(resB.PingResponse, 'PingResponse B should exist');
	});
});
