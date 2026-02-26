import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Cos > Account Create', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify COS settings are applied to a new account', async () => {
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
				<a n="zimbraBatchedIndexingSize">0</a>
			</CreateCosRequest>`, adminAuthToken
		);
		const cosId = cosRes.CreateCosResponse.cos[0].id;

		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = acctRes.CreateAccountResponse.account[0].id;

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'GetAccountResponse should exist');
		const account = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');

		const attrs = getRes.GetAccountResponse.account[0].a || [];
		const batchAttr = attrs.find(a => a.n === 'zimbraBatchedIndexingSize');
		assert.exists(batchAttr, 'zimbraBatchedIndexingSize should exist');
		assert.equal(batchAttr._content, '0');
	});
});
