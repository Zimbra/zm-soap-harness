import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Bugs > Bug 23590', function () {
    let testAccount2, testAccount3;
    let auth2, auth3;
    let account2Id;

    before(async function () {
        testAccount2 = `bug23590_2_${common.getUniqueString()}@${config.testDomain}`;
        testAccount3 = `bug23590_3_${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

        account2Id = res2.accountId;

        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);
        auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
        if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
    });


    it('Regression | Verify Searching Shared Folders that have subfolder works fine', async function () {
        // 1. Create subfolder of inbox for account2
        const getFolder2 = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth2);
        const inboxId2 = getFolder2.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        const subFolderName = `sub_${common.getUniqueString()}`;
        const createResp2 = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name="${subFolderName}" l="${inboxId2}"/>
            </CreateFolderRequest>`, auth2);
        const subFolderId = createResp2.CreateFolderResponse.folder[0].id;

        // 2. Add test mails
        const msgSubjectInbox = `InboxMsg_${common.getUniqueString()}`;
        const msgSubjectSub = `SubMsg_${common.getUniqueString()}`;

        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${inboxId2}">
                    <content>Subject: ${msgSubjectInbox}\r\n\r\nContent</content>
                </m>
            </AddMsgRequest>`, auth2);

        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${subFolderId}">
                    <content>Subject: ${msgSubjectSub}\r\n\r\nContent</content>
                </m>
            </AddMsgRequest>`, auth2);

        // 3. Share Inbox with inh="1" with account3
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${inboxId2}">
                    <grant gt="usr" inh="1" perm="r" d="${testAccount3}"/>
                </action>
            </FolderActionRequest>`, auth2);

        // 4. Authenticate as account3 and create mountpoint
        const mountName = `mount_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account2Id}" rid="${inboxId2}" view="message"/>
            </CreateMountpointRequest>`, auth3);
        const mountId = mountResp.CreateMountpointResponse.link[0].id;

        // 5. Do search for account2's inbox mail
        const searchResp1 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                <query>${msgSubjectInbox} (inid:${mountId} OR inid:"${account2Id}:${inboxId2}" OR is:local)</query>
            </SearchRequest>`, auth3);

        assert.exists(searchResp1.SearchResponse.m, 'Should find message in shared inbox');
        assert.equal(searchResp1.SearchResponse.m[0].su, msgSubjectInbox);

        // 6. Do search for account2's subfolder mail
        const searchResp2 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message" limit="25">
                <query>${msgSubjectSub} (inid:${mountId} OR inid:"${account2Id}:${subFolderId}" OR is:local)</query>
            </SearchRequest>`, auth3);

        assert.exists(searchResp2.SearchResponse.m, 'Should find message in shared subfolder');
        assert.equal(searchResp2.SearchResponse.m[0].su, msgSubjectSub);
    });
});
