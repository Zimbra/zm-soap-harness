import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > COS > Account Create', function () {
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
	it('Smoke | Verify COS settings are applied to a new account', async () => {
		const cosName = `cos${common.getUniqueString()}`;

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraBatchedIndexingSize">0</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;

		// GetAccountRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const account = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;

		// Verify response
		assert.exists(account.id, 'Account should have an id');

		const attrs = getRes.GetAccountResponse.account[0].a || [];
		const batchAttr = attrs.find(a => a.n === 'zimbraBatchedIndexingSize');

		// Verify response
		assert.exists(batchAttr, 'zimbraBatchedIndexingSize should exist');
		assert.equal(batchAttr._content, '0');
	});
});
