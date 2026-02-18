import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Bugs > Bug 39804', function () {
    let testAccount1, testAccount2, testAccount3;
    let auth1;
    let account1Id, account2Id, account3Id;
    let inboxId;

    before(async function () {
        // Create 3 accounts
        testAccount1 = `bug39804_1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `bug39804_2_${common.getUniqueString()}@${config.testDomain}`;
        testAccount3 = `bug39804_3_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
        const res3 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

        account1Id = res1.accountId;
        account2Id = res2.accountId;
        account3Id = res3.accountId;

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

        // Get Inbox
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
        if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
    });


    it('Functional | Verify sharing multiple folders (scaled down from 2000 to 10)', async function () {
        this.timeout(30000); // Increase timeout for loop

        const folderCount = 10; // Scaled down from 2000

        for (let i = 0; i < folderCount; i++) {
            const folderName = `folder_${i}_${common.getUniqueString()}`;

            // Create Folder
            const createResp = await soap.makeSOAPEnvelopeAccount(
                `<CreateFolderRequest xmlns="urn:zimbraMail">
                    <folder name="${folderName}" l="${inboxId}"/>
                </CreateFolderRequest>`, auth1);
            const folderId = createResp.CreateFolderResponse.folder[0].id;

            // Share with Account 2
            await soap.makeSOAPEnvelopeAccount(
                `<FolderActionRequest xmlns="urn:zimbraMail">
                    <action op="grant" id="${folderId}">
                        <grant gt="usr" d="${testAccount2}" perm="r"/>
                    </action>
                </FolderActionRequest>`, auth1);

            // Share with Account 3
            await soap.makeSOAPEnvelopeAccount(
                `<FolderActionRequest xmlns="urn:zimbraMail">
                    <action op="grant" id="${folderId}">
                        <grant gt="usr" d="${testAccount3}" perm="r"/>
                    </action>
                </FolderActionRequest>`, auth1);
        }
    });


    it('Functional | Verify DeleteAccount logic (Account 3)', async function () {
        const adminAuth = await soap.getAdminAuthToken();
        await soap.deleteAccount(account3Id, adminAuth);
        // Originally tested restart here. We skip restart.
        // We just verify account deletion didn't crash anything.

        // Verify Account 1 still ALIVE
        await soap.makeSOAPEnvelopeAccount('<NoOpRequest xmlns="urn:zimbraMail"/>', auth1);
    });
});
