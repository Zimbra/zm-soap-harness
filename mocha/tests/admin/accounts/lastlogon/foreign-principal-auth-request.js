import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > LastLogon > Foreign Principal Auth Request', function () {
    this.timeout(120 * 1000);
    let adminAuth;

    before(async function () {
        adminAuth = await soap.getAdminAuthToken();
    });

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

    it('Functional | AuthRequest - verify zimbraLastLogonTimestamp is updated', async () => {
        const accountName = 'fp' + common.getUniqueString() +
            '@' + config.testDomain;
        const foreignPrincipal = 'test:' + common.getUniqueString();

        // Get current zimbraLastLogonTimestampFrequency
        const configRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLastLogonTimestampFrequency"/>
			</GetConfigRequest>`, adminAuth);
        assert.exists(configRes.GetConfigResponse,
            'GetConfigResponse should exist');

        // Create account with foreign principal
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraForeignPrincipal">${foreignPrincipal}</a>
			</CreateAccountRequest>`, adminAuth);
        assert.exists(createRes.CreateAccountResponse,
            'Should create account');
        const acct = Array.isArray(
            createRes.CreateAccountResponse.account)
            ? createRes.CreateAccountResponse.account[0]
            : createRes.CreateAccountResponse.account;
        const acctId = acct.id;

        // Set frequency to 1 second
        const modConfigRes = await soap.makeSOAPEnvelopeAdmin(
            `<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLastLogonTimestampFrequency">1s</a>
			</ModifyConfigRequest>`, adminAuth);
        assert.exists(modConfigRes.ModifyConfigResponse,
            'ModifyConfigResponse should exist');

        // Flush cache
        await soap.makeSOAPEnvelopeAdmin(
            `<FlushCacheRequest xmlns="urn:zimbraAdmin">
				<cache type="config"/>
			</FlushCacheRequest>`, adminAuth);

        // Auth via foreign principal
        const authRes = await soap.makeSOAPEnvelopeAccount(
            `<AuthRequest xmlns="urn:zimbraAccount">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);
        assert.exists(authRes.AuthResponse,
            'AuthResponse should exist');

        // Get timestamp
        const getRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuth);
        assert.exists(getRes.GetAccountResponse,
            'GetAccountResponse should exist');
        const acctData = Array.isArray(
            getRes.GetAccountResponse.account)
            ? getRes.GetAccountResponse.account[0]
            : getRes.GetAccountResponse.account;
        const timestamp1 = acctData.a.find(
            a => a.n === 'zimbraLastLogonTimestamp');
        assert.exists(timestamp1,
            'zimbraLastLogonTimestamp should exist');

        // Wait and auth again
        await new Promise(r => setTimeout(r, 5000));

        await soap.makeSOAPEnvelopeAccount(
            `<AuthRequest xmlns="urn:zimbraAccount">
				<account by="foreignPrincipal">${foreignPrincipal}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`);

        // Get updated timestamp
        const getRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${acctId}</account>
			</GetAccountRequest>`, adminAuth);
        const acctData2 = Array.isArray(
            getRes2.GetAccountResponse.account)
            ? getRes2.GetAccountResponse.account[0]
            : getRes2.GetAccountResponse.account;
        const timestamp2 = acctData2.a.find(
            a => a.n === 'zimbraLastLogonTimestamp');
        assert.exists(timestamp2,
            'zimbraLastLogonTimestamp should still exist');
        assert.notEqual(
            timestamp1._content,
            timestamp2._content,
            'Timestamp should have been updated');
    });
});
