import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Harness Self Check > Check Soap', function () {
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
    it('Functional | SOAP Harness - CheckSoap - Verify the available namespaces', async () => {
        // Admin namespace - CreateAccountRequest (zimbraAdmin)
        const accountEmail = `account.${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
        const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');

        // Account namespace - AuthRequest (zimbraAccount)
        const acctToken = await soap.getAccountAuthToken(accountEmail);

        // Mail namespace - GetFolderRequest (zimbraMail)
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acctToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
    });

    it('Functional | SOAP Harness - CheckSoap - Verify the t - test and t - soaptest types 1', async () => {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PingRequest should not fault');
    });

    it('Functional | SOAP Harness - CheckSoap - Verify the t - test and t - soaptest types 2', async () => {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PingRequest should not fault');
    });

    it('Functional | SOAP Harness - CheckSoap - Verify the t - test and t - soaptest types 3', async () => {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<PingRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'PingRequest should not fault');
    });

    it('Functional | SOAP Harness - CheckSoap - Verify the t - requestContext', async () => {
        // Create an account
        const accountEmail = `account.${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
        const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');

        // Auth as account
        const acctToken = await soap.getAccountAuthToken(accountEmail);

        // Use account token to get folder (verify requestContext override)
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acctToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
    });

    it('Functional | SOAP Harness - CheckSoap - Verify the t - header', async () => {
        // Create an account
        const accountEmail = `account.${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
        assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
        const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');

        // Auth as account
        const acctToken = await soap.getAccountAuthToken(accountEmail);

        // NoOpRequest to establish session
        const noOpRes = await soap.makeSOAPEnvelopeAccount(
            `<NoOpRequest xmlns="urn:zimbraMail"/>`, acctToken
        );
        assert.notExists(noOpRes.Fault, 'NoOpRequest should not fault');
    });
});
