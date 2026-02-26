import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Account Modify', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Modify the foreign principal attribute', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp1}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (() => { const a = createRes.CreateAccountResponse?.account; return Array.isArray(a) ? a[0].id : a?.id; })();

		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraForeignPrincipal">${fp2}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse,
			'ModifyAccountResponse should exist');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');

		// Old FP should fail
		await common.sleep(2000);
		const getOld = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp1}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(getOld.Fault, 'Old FP should no longer work');

		// New FP should succeed
		await common.sleep(2000);
		const getNew = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp2}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.equal((Array.isArray(getNew.GetAccountResponse?.account) ? (Array.isArray(getNew.GetAccountResponse?.account) ? getNew.GetAccountResponse.account[0].id : getNew.GetAccountResponse?.account?.id) : getNew.GetAccountResponse?.account?.id), acctId);
	});


	it('Sanity | Add the foreign principal attribute to an existing account', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (() => { const a = createRes.CreateAccountResponse?.account; return Array.isArray(a) ? a[0].id : a?.id; })();

		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAccountResponse,
			'ModifyAccountResponse should exist');
		const account = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0]
			: modRes.ModifyAccountResponse.account;
		assert.exists(account.id, 'Account should have an id');

		await common.sleep(2000);
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${acctName}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetAccountResponse,
			'Should be able to get account after FP modify');
		const acct = Array.isArray(getRes.GetAccountResponse.account)
			? getRes.GetAccountResponse.account[0]
			: getRes.GetAccountResponse.account;
		assert.equal(acct.id, acctId);

		const fpAttrs = (acct.a || []).filter(a => a.n === 'zimbraForeignPrincipal');
		assert.isTrue(fpAttrs.some(a => a._content === fp),
			'FP should be set on account');
	});


	it('Sanity | Add a second foreign principal to the account', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const acctName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${fp1}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = (() => {
			const a = createRes.CreateAccountResponse?.account;
			return Array.isArray(a) ? a[0].id : a?.id;
		})();

		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<a n="+zimbraForeignPrincipal">${fp2}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Both FPs should work
		await common.sleep(2000);
		const get1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp1}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(get1.Fault, 'Response should not be a Fault');
		assert.exists(get1.GetAccountResponse, `Should find account by first FP: ${fp1}`);

		const acct1 = Array.isArray(get1.GetAccountResponse.account) ? get1.GetAccountResponse.account[0] : get1.GetAccountResponse.account;
		assert.equal(acct1.id, acctId);

		const get2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp2}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(get2.Fault, 'Response should not be a Fault');
		assert.exists(get2.GetAccountResponse,
			`Should find account by second FP: ${fp2}`);
		const acct2 = Array.isArray(get2.GetAccountResponse.account) ? get2.GetAccountResponse.account[0] : get2.GetAccountResponse.account;
		assert.equal(acct2.id, acctId);
	});
});
