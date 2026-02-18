import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Bugs > Bug 30049', function () {
    let testAccount1, testAccount2;
    let auth1;
    let account1Id;

    before(async function () {
        testAccount1 = `bug30049_1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `bug30049_2_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

        account1Id = res1.accountId;
        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
    });


    it('Functional | Verify "key" grantee type for folder ACL', async function () {
        // Create folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const folderName = `folder_key_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name="${folderName}" l="${inboxId}"/>
            </CreateFolderRequest>`, auth1);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        // Add Message
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${folderId}">
                    <content>test content</content>
                </m>
            </AddMsgRequest>`, auth1);

        // Share with gt="key"
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="key" perm="r" d="${testAccount2}"/>
                </action>
            </FolderActionRequest>`, auth1);
    });
});
