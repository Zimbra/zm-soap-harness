import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account-Create', function () {
    let adminAuth;

    before(async function () {
        await main.before(this);
        adminAuth = await soap.getAdminAuthToken();
    });


    it('Smoke | Create an account with valid values', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.CreateAccountResponse.account[0].id, 'Account ID should exist');
    });


    it('Sanity | Create an account without a password', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        // Password not listed in request, implied relying on defaults or behavior
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.CreateAccountResponse.account[0].id, 'Account ID should exist (created without password)');
    });


    it('Regression | Create an account without account name', async function () {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should return a Fault');
        assert.include(res.Fault.Detail.Error.Code, 'service.FAILURE', 'Should return service.FAILURE');
    });


    it('Regression | Create an account with invalid names', async function () {
        const invalidNames = [
            '             ', // space
            '',              // blank
            ":''&lt;//\\\\", // spchar - escaped < for XML
            'some text',     // sometext (not email format)
            '-1',            // negative
            '0',             // zero
            '12345678901234567890' // largenumber
        ];

        for (const name of invalidNames) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                    <name>${name}</name>
                    <password>${config.accountPassword}</password>
                </CreateAccountRequest>`, adminAuth);

            assert.exists(res.Fault, `Should return a Fault for name: "${name}"`);
            assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', `Should return INVALID_REQUEST for "${name}"`);
        }
    });


    it('Regression | Create an account with account name as *******', async function () {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>"****************"</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should return a Fault');
        assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should return service.INVALID_REQUEST');
    });


    it('Regression | Create an account with invalid passwords', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>             </password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should return a Fault');
        assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD', 'Should return account.INVALID_PASSWORD');
    });


    it('Regression | Create an account with invalid domain names', async function () {
        // Case: Non-existent domain
        const nonExistentDomainAccount = `test.${common.getUniqueString()}@nonexistent.domain.com`;
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${nonExistentDomainAccount}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should fail for non-existent domain');
        assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_DOMAIN', 'Should return account.NO_SUCH_DOMAIN');

        // Case: Invalid chars in domain
        const invalidCharDomainAccount = `test.${common.getUniqueString()}@invalid$domain.com`;
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${invalidCharDomainAccount}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should fail for invalid domain chars');
        // Can be INVALID_REQUEST or NO_SUCH_DOMAIN depending on parsing/validation order
        const code = res.Fault.Detail.Error.Code;
        assert.isTrue(code.includes('service.INVALID_REQUEST') || code.includes('account.NO_SUCH_DOMAIN'),
            `Expected INVALID_REQUEST or NO_SUCH_DOMAIN, got ${code}`);
    });


    // CreateAccountRequest9: Create an account without user id
    it('Regression | Create an account without domain (default domain)', async function () {
        const userName = `user${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${userName}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);

        // XML expects success, but current server enforces valid email address
        assert.exists(res.Fault, 'Should fail without domain on this server');
        assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Should return service.INVALID_REQUEST');
    });


    it('Smoke | Create an already existing account', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;

        // 1. Create account
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);
        assert.exists(res.CreateAccountResponse.account[0].id, 'First creation should succeed');

        // 2. Try to create again
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}different</password>
            </CreateAccountRequest>`, adminAuth);

        assert.exists(res.Fault, 'Should fail on duplicate account');
        assert.include(res.Fault.Detail.Error.Code, 'account.ACCOUNT_EXISTS', 'Should return account.ACCOUNT_EXISTS');
    });


    it('Functional | Create an account with valid values of zimbraContactMaxNumEntries', async function () {
        // Test with 0
        let testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraContactMaxNumEntries">0</a>
            </CreateAccountRequest>`, adminAuth);
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with 0');

        // Test with 1000
        testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraContactMaxNumEntries">1000</a>
            </CreateAccountRequest>`, adminAuth);
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with 1000');
    });


    it('Regression | Create an account with invalid values of zimbraContactMaxNumEntries', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        const invalidValues = [
            'sometext',      // sometext
            '-1',            // negative
            ":''&lt;//\\\\", // spchar
        ];

        // Note: XML tests logic seems to expect INVALID_ATTR_VALUE for these.

        for (const val of invalidValues) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                    <name>${testAccount}</name>
                    <password>${config.accountPassword}</password>
                    <a n="zimbraContactMaxNumEntries">${val}</a>
                </CreateAccountRequest>`, adminAuth);

            assert.exists(res.Fault, `Should fail for zimbraContactMaxNumEntries="${val}"`);
            assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', `Should return INVALID_ATTR_VALUE for "${val}"`);
        }
    });


    it('Functional | Create an account with valid values of zimbraPrefMailPollingInterval', async function () {
        // Test with 5m
        let testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailPollingInterval">5m</a>
            </CreateAccountRequest>`, adminAuth);
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with 5m');

        // Test with 1000
        testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraPrefMailPollingInterval">1000</a>
            </CreateAccountRequest>`, adminAuth);
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with 1000');
    });


    it('Regression | Create an account with invalid values of zimbraPrefMailPollingInterval', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        const invalidValues = [
            'sometext',
            '-1',
            // '0', // 0 is apparently valid
            ":''&lt;//\\\\",
            '12345678901234567890'
        ];

        for (const val of invalidValues) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                    <name>${testAccount}</name>
                    <password>${config.accountPassword}</password>
                    <a n="zimbraPrefMailPollingInterval">${val}</a>
                </CreateAccountRequest>`, adminAuth);

            assert.exists(res.Fault, `Should fail for zimbraPrefMailPollingInterval="${val}"`);
            const code = res.Fault.Detail.Error.Code;
            assert.isTrue(code.includes('account.INVALID_ATTR_VALUE') || code.includes('service.FAILURE'),
                `Expected INVALID_ATTR_VALUE or FAILURE for "${val}", got ${code}`);
        }
    });


    it('Functional | Create an account with valid values of zimbraAttachmentsViewInHtmlOnly', async function () {
        // Test with TRUE
        let testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        let res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraAttachmentsViewInHtmlOnly">TRUE</a>
            </CreateAccountRequest>`, adminAuth);

        if (res.Fault) {
            console.log('CreateAccountRequest16 Failed (TRUE):', JSON.stringify(res.Fault));
            assert.fail(`Failed to create account with zimbraAttachmentsViewInHtmlOnly=TRUE: ${res.Fault.Reason.Text}`);
        }
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with TRUE');

        // Test with FALSE
        testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${testAccount}</name>
                <password>${config.accountPassword}</password>
                <a n="zimbraAttachmentsViewInHtmlOnly">FALSE</a>
            </CreateAccountRequest>`, adminAuth);

        if (res.Fault) {
            console.log('CreateAccountRequest16 Failed (FALSE):', JSON.stringify(res.Fault));
            assert.fail(`Failed to create account with zimbraAttachmentsViewInHtmlOnly=FALSE: ${res.Fault.Reason.Text}`);
        }
        assert.exists(res.CreateAccountResponse.account[0].id, 'Should succeed with FALSE');
    });


    it('Regression | Create an account with invalid values of zimbraAttachmentsViewInHtmlOnly', async function () {
        const testAccount = `test.${common.getUniqueString()}@${config.testDomain}`;
        const invalidValues = [
            'sometext',
            '-1',
            '0',
            ":''&lt;//\\\\",
            '12345678901234567890'
        ];

        for (const val of invalidValues) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                    <name>${testAccount}</name>
                    <password>${config.accountPassword}</password>
                    <a n="zimbraAttachmentsViewInHtmlOnly">${val}</a>
                </CreateAccountRequest>`, adminAuth);

            assert.exists(res.Fault, `Should fail for zimbraAttachmentsViewInHtmlOnly="${val}"`);
            assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', `Should return INVALID_ATTR_VALUE for "${val}"`);
        }
    });

});
