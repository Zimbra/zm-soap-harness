import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Count Account Request', function () {
	this.timeout(30 * 1000);
	let adminAuth;

	before(async function () {
		adminAuth = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Sanity | Sanity test for CountAccountRequest', async () => {
		const cosName = 'cos' + common.getUniqueString();
		const account1Name = 'test' + common.getUniqueString() +
			'@' + config.testDomain;
		const account2Name = 'test' + common.getUniqueString() +
			'@' + config.testDomain;

		// Create COS
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuth);
		assert.notExists(cosRes.Fault, 'Response should not be a Fault');
		assert.exists(cosRes.CreateCosResponse,
			'CreateCosResponse should exist');
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		// Create account 1 with COS
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuth);
		assert.notExists(acct1Res.Fault, 'Response should not be a Fault');
		assert.exists(acct1Res.CreateAccountResponse,
			'Should create account 1');

		// Create account 2 with COS
		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuth);
		assert.notExists(acct2Res.Fault, 'Response should not be a Fault');
		assert.exists(acct2Res.CreateAccountResponse,
			'Should create account 2');

		// Count accounts
		const countRes = await soap.makeSOAPEnvelopeAdmin(
			`<CountAccountRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</CountAccountRequest>`, adminAuth);
		assert.notExists(countRes.Fault, 'Response should not be a Fault');
		assert.exists(countRes.CountAccountResponse,
			'CountAccountResponse should exist');
		const cosEntries = Array.isArray(countRes.CountAccountResponse.cos)
			? countRes.CountAccountResponse.cos
			: [countRes.CountAccountResponse.cos];
		const targetCos = cosEntries.find(c => c.name === cosName);
		assert.exists(targetCos,
			`COS '${cosName}' should appear in count`);
		assert.equal(targetCos._content, '2',
			'COS should have 2 accounts');
	});
});
