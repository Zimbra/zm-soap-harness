import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Count', function () {
	let adminAuthToken;
	let domain1Name, domain2Name;
	let cos1Name, cos2Name, cos3Name;
	let cos1Id, cos2Id, cos3Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const ts = common.getUniqueString();
		domain1Name = `test${ts}.domain1.com`;
		domain2Name = `test${ts}.domain2.com`;
		cos1Name = `gold${ts}`;
		cos2Name = `silver${ts}`;
		cos3Name = `platinum${ts}`;

		// Create COSes
		const cosRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cos1Name}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		cos1Id = cosRes1.CreateCosResponse.cos[0].id;

		// CreateCosRequest
		const cosRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cos2Name}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		cos2Id = cosRes2.CreateCosResponse.cos[0].id;

		// CreateCosRequest
		const cosRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cos3Name}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		cos3Id = cosRes3.CreateCosResponse.cos[0].id;

		// Create Domains
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts in domain1
		// account1 -> cos1
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos1Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account2 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account3 -> default COS
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account4 -> cos3
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos3Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account5 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account6 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create accounts in domain2
		// account7 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account8 -> default COS
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account9 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account10 -> cos1
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos1Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account11 -> cos3
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos3Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account12 -> default COS
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// account13 -> cos2
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Smoke | Count Accounts for domain', async () => {
		// CountAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CountAccountRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${domain1Name}</domain>
			</CountAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');

		const cosList = response.CountAccountResponse.cos;

		const findCos = (name) => cosList.find(c => c.name === name);

		const c1 = findCos(cos1Name);

		// Verify response
		assert.exists(c1, `COS ${cos1Name} should be in response`);

		assert.equal(c1._content, '1', `${cos1Name} should have 1 account`);

		const c2 = findCos(cos2Name);

		// Verify response
		assert.exists(c2, `COS ${cos2Name} should be in response`);

		assert.equal(c2._content, '3', `${cos2Name} should have 3 accounts`);

		const c3 = findCos(cos3Name);

		// Verify response
		assert.exists(c3, `COS ${cos3Name} should be in response`);

		assert.equal(c3._content, '1', `${cos3Name} should have 1 account`);

		const cDefault = findCos('default');

		// Verify response
		assert.exists(cDefault, 'default COS should be in response');

		assert.equal(cDefault._content, '1', 'default COS should have 1 account');
	});


	it('Smoke | Count Accounts for domain 1', async () => {
		// CountAccountRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CountAccountRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${domain2Name}</domain>
			</CountAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');

		const cosList = response.CountAccountResponse.cos;

		const findCos = (name) => cosList.find(c => c.name === name);

		const c1 = findCos(cos1Name);

		// Verify response
		assert.exists(c1, `COS ${cos1Name} should be in response`);

		assert.equal(c1._content, '1', `${cos1Name} should have 1 account`);

		const c2 = findCos(cos2Name);

		// Verify response
		assert.exists(c2, `COS ${cos2Name} should be in response`);

		assert.equal(c2._content, '3', `${cos2Name} should have 3 accounts`);

		const c3 = findCos(cos3Name);

		// Verify response
		assert.exists(c3, `COS ${cos3Name} should be in response`);

		assert.equal(c3._content, '1', `${cos3Name} should have 1 account`);

		const cDefault = findCos('default');

		// Verify response
		assert.exists(cDefault, 'default COS should be in response');

		assert.equal(cDefault._content, '2', 'default COS should have 2 accounts');
	});
});
