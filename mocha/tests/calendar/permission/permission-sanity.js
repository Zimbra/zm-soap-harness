import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Permission > Permission Sanity', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Smoke | GrantPermissionRequest for invite right', async () => {
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const token = await soap.getAccountAuthToken(email);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, token
        );
        assert.notExists(res.Fault, 'GrantPermission should not fault');
        assert.notExists(
            res.Fault,
            'GrantPermissionResponse should exist'
        );
    });


    it('Sanity | GetPermissionRequest after granting invite right', async () => {
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const token = await soap.getAccountAuthToken(email);

        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, token
        );

        const res = await soap.makeSOAPEnvelopeAccount(
            '<GetPermissionRequest xmlns="urn:zimbraMail"/>', token
        );
        assert.notExists(res.Fault, 'GetPermission should not fault');
        assert.notExists(
            res.Fault,
            'GetPermissionResponse should exist'
        );
        const aces = Array.isArray(res.GetPermissionResponse.ace)
            ? res.GetPermissionResponse.ace
            : [res.GetPermissionResponse.ace];
        const inviteAce = aces.find(
            a => a.right === 'invite' && a.gt === 'pub'
        );
        assert.exists(inviteAce, 'invite/pub ACE should exist');
    });


    it('Sanity | RevokePermissionRequest for invite right', async () => {
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const token = await soap.getAccountAuthToken(email);

        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, token
        );

        const res = await soap.makeSOAPEnvelopeAccount(
            `<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"
					zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, token
        );
        assert.notExists(res.Fault, 'RevokePermission should not fault');
        assert.notExists(
            res.Fault,
            'RevokePermissionResponse should exist'
        );
    });


    it('Sanity | CheckPermissionRequest for invite right', async () => {
        const email1 = `acct1${common.getUniqueString()}@${testDomain}`;
        const email2 = `acct2${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
        const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
        	? createAcctRes.CreateAccountResponse.account[0]
        	: createAcctRes.CreateAccountResponse.account;
        assert.exists(acctInfo.id, 'Account ID should exist');
        const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
        const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
        const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
        	? createAcctRes2.CreateAccountResponse.account[0]
        	: createAcctRes2.CreateAccountResponse.account;
        assert.exists(acctInfo2.id, 'Account ID should exist');
        const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');
        const token1 = await soap.getAccountAuthToken(email1);
        const token2 = await soap.getAccountAuthToken(email2);

        // Grant invite right on acct1
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, token1
        );

        // Check from acct2
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckPermissionRequest xmlns="urn:zimbraMail">
				<target type="account" by="name">${email1}</target>
				<right>invite</right>
			</CheckPermissionRequest>`, token2
        );
        assert.notExists(res.Fault, 'CheckPermission should not fault');
        assert.equal(
            res.CheckPermissionResponse.allow, '1',
            'Permission should be allowed'
        );
    });
});
