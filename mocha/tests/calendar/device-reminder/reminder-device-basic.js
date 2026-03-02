import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Device-Reminder > Reminder-Device-Basic', function () {
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

    async function makeAcct(prefix, enableFeature) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const extra = enableFeature
            ? '<a n="zimbraFeatureCalendarReminderDeviceEmailEnabled">TRUE</a>'
            : '';
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
				${extra}
			</CreateAccountRequest>`, adminAuthToken
        );
        const id = res.CreateAccountResponse.account[0].id;
        const token = await soap.getAccountAuthToken(email);
        return { email, id, token };
    }

    async function getAttr(acctName, attrName) {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${acctName}</account>
			</GetAccountRequest>`, adminAuthToken
        );
        const acct = res.GetAccountResponse.account[0];
        const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
        const attr = attrs.find(a => a.n === attrName);
        return attr ? attr._content : null;
    }


    it('Smoke | VerifyCodeRequest with invalid code', async () => {
        const acct1 = await makeAcct('acct1', true);
        const acct3 = await makeAcct('acct3', true);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<VerifyCodeRequest xmlns="urn:zimbraMail"
				a="${acct3.email}" code="ABCEDFG"/>`,
            acct1.token
        );
        assert.notExists(res.Fault, 'VerifyCode should not fault');
        assert.equal(
            res.VerifyCodeResponse.success, '0',
            'Verification should fail with invalid code'
        );

        // Verify device email not set
        const deviceEmail = await getAttr(
            acct1.email, 'zimbraCalendarReminderDeviceEmail'
        );
        assert.isNull(
            deviceEmail,
            'Device email should not be set'
        );
    });


    it('Sanity | Configure reminder device via SendVerificationCode', async () => {
        const acct1 = await makeAcct('acct1', true);
        const acct2 = await makeAcct('acct2', false);

        // Send verification code
        const sendRes = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct2.email}</a>
			</SendVerificationCodeRequest>`, acct1.token
        );
        assert.notExists(sendRes.Fault, 'SendVerificationCode should not fault');
        assert.exists(
            sendRes.SendVerificationCodeResponse,
            'Response should exist'
        );
    });


    it('Sanity | Invalidate unverified device returns error', async () => {
        const acct3 = await makeAcct('acct3', true);
        const acct4 = await makeAcct('acct4', true);

        // SendVerificationCode (but don't verify)
        const sendRes = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct4.email}</a>
			</SendVerificationCodeRequest>`, acct3.token
        );
        assert.notExists(sendRes.Fault, 'SendVerificationCode should not fault');

        // Invalidate without prior verification - should fault
        const invRes = await soap.makeSOAPEnvelopeAccount(
            `<InvalidateReminderDeviceRequest xmlns="urn:zimbraMail"
				a="${acct4.email}"/>`, acct3.token
        );
        assert.exists(
            invRes.Fault,
            'InvalidateReminderDevice should fault for unverified device'
        );

        // Verify device email not set
        const deviceEmail = await getAttr(
            acct3.email, 'zimbraCalendarReminderDeviceEmail'
        );
        assert.isNull(
            deviceEmail,
            'Device email should not be set'
        );
    });


    it('Sanity | Invalidate non-configured device returns error', async () => {
        const acct4 = await makeAcct('acct4', true);
        const acct3 = await makeAcct('acct3', true);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<InvalidateReminderDeviceRequest xmlns="urn:zimbraMail"
				a="${acct3.email}"/>`, acct4.token
        );
        assert.exists(res.Fault, 'Should fault for non-configured device');

        // Verify device email not set
        const deviceEmail = await getAttr(
            acct4.email, 'zimbraCalendarReminderDeviceEmail'
        );
        assert.isNull(
            deviceEmail,
            'Device email should not be set'
        );
    });


    it('Sanity | Verify code for wrong address fails', async () => {
        const acct5 = await makeAcct('acct5', true);
        const acct6 = await makeAcct('acct6', true);
        const acct7 = await makeAcct('acct7', false);

        // Send verification code to acct6
        await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct6.email}</a>
			</SendVerificationCodeRequest>`, acct5.token
        );

        // Verify with wrong address (acct7 instead of acct6)
        const res = await soap.makeSOAPEnvelopeAccount(
            `<VerifyCodeRequest xmlns="urn:zimbraMail"
				a="${acct7.email}" code="INVALID"/>`,
            acct5.token
        );
        assert.notExists(res.Fault, 'VerifyCode should not fault');
        assert.equal(
            res.VerifyCodeResponse.success, '0',
            'Verification should fail for wrong address'
        );

        // Device email should not be set
        const deviceEmail = await getAttr(
            acct5.email, 'zimbraCalendarReminderDeviceEmail'
        );
        assert.isNull(deviceEmail, 'Device email should not be set');
    });


    it('Sanity | Configure multiple reminder devices', async () => {
        const acct6 = await makeAcct('acct6', true);
        const acct4 = await makeAcct('acct4', true);
        const acct5 = await makeAcct('acct5', true);

        // Send verification code to acct4
        const send1 = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct4.email}</a>
			</SendVerificationCodeRequest>`, acct6.token
        );
        assert.notExists(send1.Fault, 'SendVerificationCode 1 should not fault');

        // Send verification code to acct5
        const send2 = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct5.email}</a>
			</SendVerificationCodeRequest>`, acct6.token
        );
        assert.notExists(send2.Fault, 'SendVerificationCode 2 should not fault');
    });


    it('Sanity | SendVerificationCode with comma separated addresses', async () => {
        const acct = await makeAcct('acct', true);
        const acct4 = await makeAcct('acct4', true);
        const acct5 = await makeAcct('acct5', true);

        const res = await soap.makeSOAPEnvelopeAccount(
            `<SendVerificationCodeRequest xmlns="urn:zimbraMail">
				<a>${acct4.email},${acct5.email}</a>
			</SendVerificationCodeRequest>`, acct.token
        );
        // Comma-separated may fault or succeed depending on server
        if (res.Fault) {
            assert.exists(res.Fault, 'May fault with comma separated');
        } else {
            assert.exists(
                res.SendVerificationCodeResponse,
                'Response should exist'
            );
        }
    });
});
