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
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos1Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// account2 -> cos2
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// account3 -> default COS
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');

		// account4 -> cos3
		const createAcctRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos3Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes4.Fault, 'CreateAccountRequest should not fault');
		const acctInfo4 = Array.isArray(createAcctRes4.CreateAccountResponse.account)
			? createAcctRes4.CreateAccountResponse.account[0]
			: createAcctRes4.CreateAccountResponse.account;
		assert.exists(acctInfo4.id, 'Account ID should exist');
		const host4 = acctInfo4.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host4, 'zimbraMailHost should exist');

		// account5 -> cos2
		const createAcctRes5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes5.Fault, 'CreateAccountRequest should not fault');
		const acctInfo5 = Array.isArray(createAcctRes5.CreateAccountResponse.account)
			? createAcctRes5.CreateAccountResponse.account[0]
			: createAcctRes5.CreateAccountResponse.account;
		assert.exists(acctInfo5.id, 'Account ID should exist');
		const host5 = acctInfo5.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host5, 'zimbraMailHost should exist');

		// account6 -> cos2
		const createAcctRes6 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes6.Fault, 'CreateAccountRequest should not fault');
		const acctInfo6 = Array.isArray(createAcctRes6.CreateAccountResponse.account)
			? createAcctRes6.CreateAccountResponse.account[0]
			: createAcctRes6.CreateAccountResponse.account;
		assert.exists(acctInfo6.id, 'Account ID should exist');
		const host6 = acctInfo6.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host6, 'zimbraMailHost should exist');

		// Create accounts in domain2
		// account7 -> cos2
		const createAcctRes7 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes7.Fault, 'CreateAccountRequest should not fault');
		const acctInfo7 = Array.isArray(createAcctRes7.CreateAccountResponse.account)
			? createAcctRes7.CreateAccountResponse.account[0]
			: createAcctRes7.CreateAccountResponse.account;
		assert.exists(acctInfo7.id, 'Account ID should exist');
		const host7 = acctInfo7.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host7, 'zimbraMailHost should exist');

		// account8 -> default COS
		const createAcctRes8 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes8.Fault, 'CreateAccountRequest should not fault');
		const acctInfo8 = Array.isArray(createAcctRes8.CreateAccountResponse.account)
			? createAcctRes8.CreateAccountResponse.account[0]
			: createAcctRes8.CreateAccountResponse.account;
		assert.exists(acctInfo8.id, 'Account ID should exist');
		const host8 = acctInfo8.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host8, 'zimbraMailHost should exist');

		// account9 -> cos2
		const createAcctRes9 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes9.Fault, 'CreateAccountRequest should not fault');
		const acctInfo9 = Array.isArray(createAcctRes9.CreateAccountResponse.account)
			? createAcctRes9.CreateAccountResponse.account[0]
			: createAcctRes9.CreateAccountResponse.account;
		assert.exists(acctInfo9.id, 'Account ID should exist');
		const host9 = acctInfo9.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host9, 'zimbraMailHost should exist');

		// account10 -> cos1
		const createAcctRes10 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos1Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes10.Fault, 'CreateAccountRequest should not fault');
		const acctInfo10 = Array.isArray(createAcctRes10.CreateAccountResponse.account)
			? createAcctRes10.CreateAccountResponse.account[0]
			: createAcctRes10.CreateAccountResponse.account;
		assert.exists(acctInfo10.id, 'Account ID should exist');
		const host10 = acctInfo10.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host10, 'zimbraMailHost should exist');

		// account11 -> cos3
		const createAcctRes11 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos3Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes11.Fault, 'CreateAccountRequest should not fault');
		const acctInfo11 = Array.isArray(createAcctRes11.CreateAccountResponse.account)
			? createAcctRes11.CreateAccountResponse.account[0]
			: createAcctRes11.CreateAccountResponse.account;
		assert.exists(acctInfo11.id, 'Account ID should exist');
		const host11 = acctInfo11.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host11, 'zimbraMailHost should exist');

		// account12 -> default COS
		const createAcctRes12 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes12.Fault, 'CreateAccountRequest should not fault');
		const acctInfo12 = Array.isArray(createAcctRes12.CreateAccountResponse.account)
			? createAcctRes12.CreateAccountResponse.account[0]
			: createAcctRes12.CreateAccountResponse.account;
		assert.exists(acctInfo12.id, 'Account ID should exist');
		const host12 = acctInfo12.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host12, 'zimbraMailHost should exist');

		// account13 -> cos2
		const createAcctRes13 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test.${common.getUniqueString()}@${domain2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cos2Id}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes13.Fault, 'CreateAccountRequest should not fault');
		const acctInfo13 = Array.isArray(createAcctRes13.CreateAccountResponse.account)
			? createAcctRes13.CreateAccountResponse.account[0]
			: createAcctRes13.CreateAccountResponse.account;
		assert.exists(acctInfo13.id, 'Account ID should exist');
		const host13 = acctInfo13.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host13, 'zimbraMailHost should exist');
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
