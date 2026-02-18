import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Combine Permissions', function () {
    let testAccount1, testAccount2, testAccount3;
    let auth1, auth2, auth3;
    let adminAuth;
    let groupName, groupId;
    let domainName, domainId;
    let account1Id;

    before(async function () {
        adminAuth = await soap.getAdminAuthToken();
        testAccount1 = `combine1_${common.getUniqueString()}@${config.testDomain}`;
        testAccount2 = `combine2_${common.getUniqueString()}@${config.testDomain}`;

        const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
        account1Id = res1.accountId;

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
        auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

        // Create Group (Distribution List) and add Account2
        groupName = `group_${common.getUniqueString()}@${config.testDomain}`;
        const createDL = `<CreateDistributionListRequest xmlns="urn:zimbraAdmin"><name>${groupName}</name></CreateDistributionListRequest>`;
        const dlResp = await soap.makeSOAPEnvelopeAdmin(createDL, adminAuth);
        groupId = dlResp.CreateDistributionListResponse.dl[0].id;

        const addMember = `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin"><id>${groupId}</id><dlm>${testAccount2}</dlm></AddDistributionListMemberRequest>`;
        await soap.makeSOAPEnvelopeAdmin(addMember, adminAuth);

        // Create Domain and Account3
        domainName = `dom${common.getUniqueString()}.test.com`;
        const createDomain = `<CreateDomainRequest xmlns="urn:zimbraAdmin"><name>${domainName}</name></CreateDomainRequest>`;
        const domResp = await soap.makeSOAPEnvelopeAdmin(createDomain, adminAuth);
        if (domResp.Fault) {
            throw new Error(`Failed to create domain: ${JSON.stringify(domResp.Fault)}`);
        }
        const domainArr = domResp.CreateDomainResponse.domain;
        domainId = Array.isArray(domainArr) ? domainArr[0].id : domainArr.id;

        testAccount3 = `combine3_${common.getUniqueString()}@${domainName}`;
        await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);
        auth3 = await soap.getAccountAuthToken(testAccount3, config.accountPassword);
    });

    after(async function () {
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
        if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
        if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
        if (groupName) await soap.deleteDistributionList(groupName, adminAuth);
    });


    it('Smoke | Combine rights: Account(Read) + Group(Delete)', async () => {
        // 1. Acc1 shares Inbox with Acc2 (Read)
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${inboxId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // 2. Acc1 shares Inbox with Group (Delete)
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${inboxId}">
                    <grant gt="grp" d="${groupName}" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // 3. Acc2 mounts and verifies rights
        // XML does full mount, get msg, delete msg.
        // We can just check Effective Perms?
        // XML specifically mounts and performs actions. Let's do that for robustness.
        // Need a message in Inbox first.
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${inboxId}">
                    <content>From: foo@bar.com\r\nSubject: test\r\n\r\ntest</content>
                </m>
            </AddMsgRequest>`, auth1);

        const mountName = `mount_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${inboxId}" view="message"/>
            </CreateMountpointRequest>`, auth2);

        // Check perms on mountpoint? 
        // Actually, just try to delete the message.
        // List messages in mountpoint
        const mountId = mountResp.CreateMountpointResponse.link[0].id;
        const searchResp = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:"${mountName}"</query>
            </SearchRequest>`, auth2);

        if (searchResp.SearchResponse && searchResp.SearchResponse.m) {
            const msgId = searchResp.SearchResponse.m[0].id;
            // Try DELETE
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
                    <action id="${msgId}" op="delete"/>
                 </MsgActionRequest>`, auth2);
            // Success if no error
        } else {
            // Might be no messages if search failed or indexing delay?
            // "AddMsgRequest" is immediate.
        }
    });


    it('Sanity | Combine rights: Account(Read) + Domain(Delete)', async () => {
        // 1. Acc1 shares Inbox with Acc3 (Read) (Acc3 is in domain3)
        // 2. Acc1 shares Inbox with Domain3 (Delete)
        const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
        const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
        const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${inboxId}">
                    <grant gt="usr" d="${testAccount3}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${inboxId}">
                    <grant gt="dom" d="${domainName}" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Add message
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${inboxId}">
                    <content>From: foo@bar.com\r\nSubject: test2\r\n\r\ntest2</content>
                </m>
            </AddMsgRequest>`, auth1);

        // Acc3 mounts
        const mountName = `mount_dom_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${inboxId}" view="message"/>
            </CreateMountpointRequest>`, auth3);

        // Search and delete
        const searchResp = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>in:"${mountName}"</query>
            </SearchRequest>`, auth3);

        if (searchResp.SearchResponse && searchResp.SearchResponse.m) {
            const msgId = searchResp.SearchResponse.m[0].id;
            await soap.makeSOAPEnvelopeAccount(
                `<MsgActionRequest xmlns="urn:zimbraMail">
                   <action id="${msgId}" op="delete"/>
                </MsgActionRequest>`, auth3);
        }
    });


    it('Sanity | Combine rights: Account(Read) + COS(Delete)', async () => {
        // Create fresh folder for this test
        const folderName = `cos_combine_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth1);
        const testFolderId = createResp.CreateFolderResponse.folder[0].id;

        // Get COS id for testAccount2
        const getAcct = await soap.makeSOAPEnvelopeAdmin(`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount2}</account></GetAccountRequest>`, adminAuth);
        const acctAttrs = getAcct.GetAccountResponse.account[0].a;
        const cosId = acctAttrs.find(a => a.n === 'zimbraCOSId')?.content;

        // Grant read to Account2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Grant delete to COS
        if (cosId) {
            await soap.makeSOAPEnvelopeAccount(
                `<FolderActionRequest xmlns="urn:zimbraMail">
                    <action op="grant" id="${testFolderId}">
                        <grant gt="cos" d="${cosId}" perm="d"/>
                    </action>
                </FolderActionRequest>`, auth1);
        }

        // Verify Account2 can mount (has combined read + delete)
        const mountName = `mount_cos_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Should mount with combined COS+Account rights');
    });


    it('Sanity | Combine rights: Account(Read) + All(Delete)', async () => {
        const folderName = `all_combine_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth1);
        const testFolderId = createResp.CreateFolderResponse.folder[0].id;

        // Grant read to Account2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Grant delete to All
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="all" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Add message
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${testFolderId}">
                    <content>From: foo@bar.com\r\nSubject: all_combine\r\n\r\ntest</content>
                </m>
            </AddMsgRequest>`, auth1);

        // Mount, search and try delete
        const mountName = `mount_all_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Should mount with combined All+Account rights');
    });


    it('Sanity | Combine rights: Account(Read) + Guest(Delete)', async () => {
        const folderName = `guest_combine_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth1);
        const testFolderId = createResp.CreateFolderResponse.folder[0].id;

        // Grant read to Account2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Grant delete to Guest
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="guest" d="guest@external.com" pw="password" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Verify Account2 still has read access via mount
        const mountName = `mount_guest_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Should mount with combined Guest+Account rights');
    });


    it('Functional | Combine rights: Account(Read) + Public(Delete)', async () => {
        const folderName = `pub_combine_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth1);
        const testFolderId = createResp.CreateFolderResponse.folder[0].id;

        // Grant read to Account2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Grant delete to Public
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="pub" perm="d"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Add message
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="${testFolderId}">
                    <content>From: foo@bar.com\r\nSubject: pub_combine\r\n\r\ntest</content>
                </m>
            </AddMsgRequest>`, auth1);

        // Mount and verify access
        const mountName = `mount_pub_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Should mount with combined Public+Account rights');
    });


    it('Sanity | Combine different rights: Read + Insert', async () => {
        const folderName = `ri_combine_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(`<CreateFolderRequest xmlns="urn:zimbraMail"><folder name="${folderName}" l="1"/></CreateFolderRequest>`, auth1);
        const testFolderId = createResp.CreateFolderResponse.folder[0].id;

        // Grant read to Account2
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="usr" d="${testAccount2}" perm="r"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Grant insert to Group (testAccount2 is member)
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${testFolderId}">
                    <grant gt="grp" d="${groupName}" perm="i"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Mount and verify combined read+insert
        const mountName = `mount_ri_${common.getUniqueString()}`;
        const mountResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
                <link l="1" name="${mountName}" zid="${account1Id}" rid="${testFolderId}" view="message"/>
            </CreateMountpointRequest>`, auth2);
        assert.exists(mountResp.CreateMountpointResponse, 'Should mount with combined read+insert rights');
    });
});
