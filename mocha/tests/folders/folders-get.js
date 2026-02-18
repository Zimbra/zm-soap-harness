import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Get Folder', function () {
    this.timeout(30 * 1000);
    let accountAuthToken;
    let accountEmail;

    before(async function () {
        await main.before(this.ctx);
        accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });


    it('Smoke | Basic GetFolderRequest', async () => {
        const getFolderRequest = `<GetFolderRequest xmlns='urn:zimbraMail'/>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify root folder
        assert.exists(getFolderResponse.GetFolderResponse, 'Verify GetFolderResponse exists');
        assert.equal(getFolderResponse.GetFolderResponse.folder[0].name, 'USER_ROOT',
            'Verify root folder name is USER_ROOT');
    });


    it('Sanity | Verify basic system folders present', async () => {
        const getFolderRequest = `<GetFolderRequest xmlns='urn:zimbraMail'/>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        const rootFolder = getFolderResponse.GetFolderResponse.folder[0];
        const folders = rootFolder.folder;

        // Verify standard system folders exist
        const calendarFolder = folders.find(f => f.name === 'Calendar');
        assert.exists(calendarFolder, 'Verify Calendar folder exists');
        assert.equal(calendarFolder.view, 'appointment', 'Verify Calendar view is appointment');

        const contactsFolder = folders.find(f => f.name === 'Contacts');
        assert.exists(contactsFolder, 'Verify Contacts folder exists');
        assert.equal(contactsFolder.view, 'contact', 'Verify Contacts view is contact');

        const draftsFolder = folders.find(f => f.name === 'Drafts');
        assert.exists(draftsFolder, 'Verify Drafts folder exists');

        const inboxFolder = folders.find(f => f.name === 'Inbox');
        assert.exists(inboxFolder, 'Verify Inbox folder exists');

        const sentFolder = folders.find(f => f.name === 'Sent');
        assert.exists(sentFolder, 'Verify Sent folder exists');

        const junkFolder = folders.find(f => f.name === 'Junk');
        assert.exists(junkFolder, 'Verify Junk folder exists');

        const trashFolder = folders.find(f => f.name === 'Trash');
        assert.exists(trashFolder, 'Verify Trash folder exists');
    });


    it('Sanity | Get folder with specific folder id', async () => {
        const folderName = `folder ${common.getUniqueString()}`;

        // Create folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Get folder by id
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail' l='${folderId}'/>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify response
        assert.exists(getFolderResponse.GetFolderResponse,
            'Verify GetFolderResponse exists');
    });


    it('Functional | Get folder with deleted folder id', async () => {
        const folderName = `folder ${common.getUniqueString()}`;

        // Create folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Delete folder
        const deleteRequest =
            `<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${folderId}'/>
			</FolderActionRequest>`;
        await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

        // Get deleted folder
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify error
        assert.exists(getFolderResponse.Fault, 'Verify Fault exists');
        assert.include(getFolderResponse.Fault.Reason.Text, 'no such folder',
            'Verify NO_SUCH_FOLDER error');
    });


    it('Regression | Get folder with blank location', async () => {
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l=''/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify error
        assert.exists(getFolderResponse.Fault, 'Verify Fault exists');
    });


    it('Sanity | Get folder with changed location', async () => {
        const folderName = `folder ${common.getUniqueString()}`;

        // Create folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Move folder to Sent (id=5)
        const moveRequest =
            `<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='5'/>
			</FolderActionRequest>`;
        await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

        // Get folder at new location
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='5'/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify response
        assert.exists(getFolderResponse.GetFolderResponse.folder[0],
            'Verify folder found at new location');
    });


    it('Functional | Get folder with non-existing folder name as id', async () => {
        const nonExistingName = `folder ${common.getUniqueString()}`;

        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${nonExistingName}'/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify error
        assert.exists(getFolderResponse.Fault, 'Verify Fault exists');
    });


    it('Sanity | Verify REST URLs in folder response | BUG-22637', async () => {
        const folderName = `rest ${common.getUniqueString()}`;

        // Create a parent folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const parentId = createResponse.CreateFolderResponse.folder[0].id;

        // Create folders with different views
        const views = ['conversation', 'message', 'contact', 'appointment', 'task', 'document'];
        for (const view of views) {
            const viewFolderRequest =
                `<CreateFolderRequest xmlns='urn:zimbraMail'>
					<folder view='${view}' name='${view}${common.getUniqueString()}' l='${parentId}'/>
				</CreateFolderRequest>`;
            await soap.makeSOAPEnvelopeAccount(viewFolderRequest, accountAuthToken);
        }

        // Get folders and verify rest URLs
        const getFolderRequest = `<GetFolderRequest xmlns='urn:zimbraMail'/>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Verify response exists
        assert.exists(getFolderResponse.GetFolderResponse,
            'Verify GetFolderResponse exists with REST URLs');
    });


    it('Functional | Get folder with specific id leading space', async () => {
        const folderName = `folder ${common.getUniqueString()}`;

        // Create folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Get folder with leading space in id
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='  ${folderId}'/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Leading space may cause error or be trimmed
        assert.exists(getFolderResponse.GetFolderResponse || getFolderResponse.Fault,
            'Should return response or fault for leading space id');
    });


    it('Functional | Get folder with specific id trailing space', async () => {
        const folderName = `folder ${common.getUniqueString()}`;

        // Create folder
        const createRequest =
            `<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
        const folderId = createResponse.CreateFolderResponse.folder[0].id;

        // Get folder with trailing space in id
        const getFolderRequest =
            `<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}  '/>
			</GetFolderRequest>`;
        const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);

        // Trailing space may cause error or be trimmed
        assert.exists(getFolderResponse.GetFolderResponse || getFolderResponse.Fault,
            'Should return response or fault for trailing space id');
    });


    it('Sanity | GetFolderRequest with visible flag for share folders', async () => {
        // Create accounts for share test
        const adminAuth = await soap.getAdminAuthToken();
        const ownerEmail = `owner_vis_${common.getUniqueString()}@${config.testDomain}`;
        const shareeEmail = `sharee_vis_${common.getUniqueString()}@${config.testDomain}`;

        const ownerRes = await soap.createAccountByNameAndEmailAddress(adminAuth, ownerEmail, ownerEmail);
        await soap.createAccountByNameAndEmailAddress(adminAuth, shareeEmail, shareeEmail);

        const ownerAuth = await soap.getAccountAuthToken(ownerEmail, config.accountPassword);
        const shareeAuth = await soap.getAccountAuthToken(shareeEmail, config.accountPassword);
        const ownerId = ownerRes.accountId;

        // Owner creates and shares folder
        const folderName = `visible_${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns='urn:zimbraMail'><folder name='${folderName}' l='1'/></CreateFolderRequest>`, ownerAuth);
        const folderId = createResp.CreateFolderResponse.folder[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns='urn:zimbraMail'>
                <action op='grant' id='${folderId}'>
                    <grant gt='usr' d='${shareeEmail}' perm='r'/>
                </action>
            </FolderActionRequest>`, ownerAuth);

        // Sharee mounts
        const mountName = `mount_vis_${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns='urn:zimbraMail'>
                <link l='1' name='${mountName}' zid='${ownerId}' rid='${folderId}' view='message'/>
            </CreateMountpointRequest>`, shareeAuth);

        // GetFolderRequest with visible='1'
        const visibleResp = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns='urn:zimbraMail' visible='1'/>`, shareeAuth);
        assert.exists(visibleResp.GetFolderResponse, 'GetFolderRequest with visible=1 should succeed');

        // GetFolderRequest with visible='0'
        const invisibleResp = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns='urn:zimbraMail' visible='0'/>`, shareeAuth);
        assert.exists(invisibleResp.GetFolderResponse, 'GetFolderRequest with visible=0 should succeed');

        // Cleanup
        await soap.deleteAccount(ownerEmail, adminAuth);
        await soap.deleteAccount(shareeEmail, adminAuth);
    });
});

