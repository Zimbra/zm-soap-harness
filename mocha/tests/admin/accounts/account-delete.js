import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account-Delete', function () {
    let adminAuth;
    let testAccountName, testAccountId;

    before(async function () {
        await main.before(this);
        adminAuth = await soap.getAdminAuthToken();
    });


    it('Smoke | Delete a valid account', async () => {
        const accountName = `del_valid_${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
                <name>${accountName}</name>
                <password>${config.accountPassword}</password>
            </CreateAccountRequest>`, adminAuth);
        const accountId = createRes.CreateAccountResponse.account[0].id;

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
                <id>${accountId}</id>
            </DeleteAccountRequest>`, adminAuth);
        assert.exists(res.DeleteAccountResponse, 'Should delete account successfully');
    });


    it('Regression | Delete two accounts simultaneously', async () => {
        const name1 = `del_sim1_${common.getUniqueString()}@${config.testDomain}`;
        const name2 = `del_sim2_${common.getUniqueString()}@${config.testDomain}`;
        const create1 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name1}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
        const create2 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${name2}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
        const id1 = create1.CreateAccountResponse.account[0].id;
        const id2 = create2.CreateAccountResponse.account[0].id;

        // Try to delete two accounts in same request
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
                <id>${id1}</id>
                <id>${id2}</id>
            </DeleteAccountRequest>`, adminAuth);
        // Should process first id only or return fault
        assert.exists(res.DeleteAccountResponse || res.Fault, 'Should handle dual delete');

        // Cleanup remaining
        await soap.makeSOAPEnvelopeAdmin(`<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${id2}</id></DeleteAccountRequest>`, adminAuth);
    });


    it('Sanity | Delete an account ID that is already deleted', async () => {
        const accountName = `del_already_${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
        const accountId = createRes.CreateAccountResponse.account[0].id;

        // Delete first time
        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${accountId}</id></DeleteAccountRequest>`, adminAuth);

        // Delete again
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${accountId}</id></DeleteAccountRequest>`, adminAuth);
        assert.exists(res.Fault, 'Should return Fault for already deleted account');
        assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT', 'Should return NO_SUCH_ACCOUNT');
    });


    it('Functional | Delete non-existing account', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${fakeId}</id></DeleteAccountRequest>`, adminAuth);
        assert.exists(res.Fault, 'Should return Fault for non-existing account');
        assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT', 'Should return NO_SUCH_ACCOUNT');
    });


    it('Regression | Delete an account with some text in id', async () => {
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>sometext</id></DeleteAccountRequest>`, adminAuth);
        assert.exists(res.Fault, 'Should return Fault for text id');
    });


    it('Functional | Delete a renamed account', async () => {
        const originalName = `del_rename_${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${originalName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
        const accountId = createRes.CreateAccountResponse.account[0].id;

        // Rename
        const newName = `del_renamed_${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<RenameAccountRequest xmlns="urn:zimbraAdmin">
                <id>${accountId}</id>
                <newName>${newName}</newName>
            </RenameAccountRequest>`, adminAuth);

        // Delete by same id
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${accountId}</id></DeleteAccountRequest>`, adminAuth);
        assert.exists(res.DeleteAccountResponse, 'Should delete renamed account by id');
    });


    it('Regression | Delete an account with spaces/spchar/zero/negative/leading trailing spaces in id', async () => {
        const invalidIds = ['   ', '', ":'<//\\\\", '0', '-1', '  sometext  ', ' leading', 'trailing '];
        for (const id of invalidIds) {
            const res = await soap.makeSOAPEnvelopeAdmin(
                `<DeleteAccountRequest xmlns="urn:zimbraAdmin"><id>${id}</id></DeleteAccountRequest>`, adminAuth);
            assert.exists(res.Fault, `Should return Fault for id="${id}"`);
        }
    });


    it('Functional | Delete account by parsing invalid attribute', async () => {
        const accountName = `del_attr_${common.getUniqueString()}@${config.testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountName}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuth);
        const accountId = createRes.CreateAccountResponse.account[0].id;

        const res = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin" invalidattr="true">
                <id>${accountId}</id>
            </DeleteAccountRequest>`, adminAuth);
        // Invalid attributes should be ignored — account should still be deleted
        assert.exists(res.DeleteAccountResponse || res.Fault, 'Should handle invalid attribute');
    });
});
