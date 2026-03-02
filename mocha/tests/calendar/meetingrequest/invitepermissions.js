import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > InvitePermissions', function () {
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

    async function makeAcct(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const token = await soap.getAccountAuthToken(email);
        return { email, token };
    }

    async function checkPerm(callerToken, targetEmail, right) {
        return soap.makeSOAPEnvelopeAccount(
            `<CheckPermissionRequest xmlns="urn:zimbraMail">
				<target type="account" by="name">
					${targetEmail}
				</target>
				<right>${right}</right>
			</CheckPermissionRequest>`, callerToken
        );
    }


    // CheckPermissionRequest-Accounts (6 tests)
    it('Smoke | CheckPermission basic', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await checkPerm(a1.token, a2.email, 'invite');
        assert.notExists(res.Fault, 'CheckPerm not fault');
    });

    it('Sanity | CheckPermission self', async () => {
        const a1 = await makeAcct('perm');
        const res = await checkPerm(a1.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'Self check not fault');
    });

    it('Sanity | CheckPermission sendAs', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await checkPerm(a1.token, a2.email, 'sendAs');
        assert.notExists(res.Fault, 'SendAs check not fault');
    });

    it('Sanity | CheckPermission sendOnBehalfOf', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await checkPerm(
            a1.token, a2.email, 'sendOnBehalfOf'
        );
        assert.notExists(res.Fault, 'SendOnBehalf not fault');
    });

    it('Sanity | CheckPermission multiple rights', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckPermissionRequest xmlns="urn:zimbraMail">
				<target type="account" by="name">
					${a2.email}
				</target>
				<right>invite</right>
				<right>sendAs</right>
			</CheckPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Multi rights not fault');
    });

    it('Sanity | CheckPermission three accounts', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const a3 = await makeAcct('perm');
        const r1 = await checkPerm(a1.token, a2.email, 'invite');
        const r2 = await checkPerm(a1.token, a3.email, 'invite');
        assert.notExists(r1.Fault, 'Check a2 not fault');
        assert.notExists(r2.Fault, 'Check a3 not fault');
    });


    // CheckPermissionRequest-Basic (5 tests)
    it('Smoke | CheckPermission resource', async () => {
        const a1 = await makeAcct('perm');
        const res = await checkPerm(a1.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'Resource perm not fault');
    });

    it('Sanity | CheckPermission viewFreeBusy', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await checkPerm(
            a1.token, a2.email, 'viewFreeBusy'
        );
        assert.notExists(res.Fault, 'ViewFB not fault');
    });

    it('Sanity | CheckPermission after grant', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await checkPerm(a2.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'After grant not fault');
    });

    it('Sanity | CheckPermission deny', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}" deny="1"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await checkPerm(a2.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'Deny check not fault');
    });

    it('Sanity | CheckPermission revoke', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        await soap.makeSOAPEnvelopeAccount(
            `<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</RevokePermissionRequest>`, a1.token
        );
        const res = await checkPerm(a2.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'Revoke check not fault');
    });


    // CheckPermissionRequest-NonAccounts (1 test)
    it('Sanity | CheckPermission non-account', async () => {
        const a1 = await makeAcct('perm');
        const res = await checkPerm(a1.token, a1.email, 'invite');
        assert.notExists(res.Fault, 'Non-acct not fault');
    });


    // GetPermissionRequest (5 tests)
    it('Smoke | GetPermission basic', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'GetPerm not fault');
    });

    it('Sanity | GetPermission after grant', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'GetPerm grant not fault');
    });

    it('Sanity | GetPermission sendAs', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendAs"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'GetPerm sendAs not fault');
    });

    it('Sanity | GetPermission all', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail"/>`,
            a1.token
        );
        assert.notExists(res.Fault, 'GetPerm all not fault');
    });

    it('Sanity | GetPermission viewFreeBusy', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'GetPerm FB not fault');
    });


    // GetPermissionRequest-Basic (4 tests)
    it('Smoke | GetPermission resource basic', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'GetPerm res not fault');
    });

    it('Sanity | GetPermission multiple', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const a3 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a3.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Multi grant not fault');
    });

    it('Sanity | GetPermission sendOnBehalf', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendOnBehalfOf"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'SendOnBehalf not fault');
    });

    it('Sanity | GetPermission empty', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Empty not fault');
    });


    // GrantPermissionRequest (8 tests)
    it('Smoke | GrantPermission basic', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant not fault');
    });

    it('Sanity | GrantPermission sendAs', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendAs" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant sendAs not fault');
    });

    it('Sanity | GrantPermission sendOnBehalf', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="sendOnBehalfOf" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant SOB not fault');
    });

    it('Sanity | GrantPermission deny', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}" deny="1"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant deny not fault');
    });

    it('Sanity | GrantPermission viewFreeBusy', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant FB not fault');
    });

    it('Sanity | GrantPermission public', async () => {
        const a1 = await makeAcct('perm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="pub"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Grant pub not fault');
    });

    it('Sanity | RevokePermission basic', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</RevokePermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Revoke not fault');
    });

    it('Sanity | GrantPermission multiple users', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        const a3 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a3.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Multi user not fault');
    });


    // GrantPermissionRequest-Basic (1 test)
    it('Sanity | GrantPermission grant verify', async () => {
        const a1 = await makeAcct('perm');
        const a2 = await makeAcct('perm');
        await soap.makeSOAPEnvelopeAccount(
            `<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr"
					d="${a2.email}"/>
			</GrantPermissionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite"/>
			</GetPermissionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Verify grant not fault');
    });
});
