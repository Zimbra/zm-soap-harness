import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder Action', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;
	let searchFolderId1, searchFolderId2;
	let folderIds = {};

	before(async function () {
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create two search folders for testing
		const searchName1 = `Search${common.getUniqueString()}`;
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName1}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const response1 = await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);

		searchFolderId1 = response1.CreateSearchFolderResponse.search[0].id;

		const searchName2 = `Search${common.getUniqueString()}`;
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName2}' query='in:sent' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken);

		searchFolderId2 = response2.CreateSearchFolderResponse.search[0].id;

		// Get standard folder ids
		const getFolderRequest = `<GetFolderRequest xmlns='urn:zimbraMail'/>`;
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;

		folderIds.inbox = folders.find(f => f.name === 'Inbox').id;
		folderIds.trash = folders.find(f => f.name === 'Trash').id;
		folderIds.sent = folders.find(f => f.name === 'Sent').id;
		folderIds.junk = folders.find(f => f.name === 'Junk').id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Try to move mail in search folder', async () => {
		// Add a message to inbox
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${folderIds.inbox}'>
					<content>Subject: test msg
					Test content ${common.getUniqueString()}</content>
				</m>
			</AddMsgRequest>`;
		const addMsgResponse = await soap.makeSOAPEnvelopeAccount(addMsgRequest, accountAuthToken);
		const messageId = addMsgResponse.AddMsgResponse.m[0].id;

		// Try to move message to search folder
		const moveRequest =
			`<MsgActionRequest xmlns='urn:zimbraMail'>
				<action id='${messageId}' op='move' l='${searchFolderId1}'/>
			</MsgActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.exists(moveResponse.Fault, 'Verify Fault exists');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Functional | Try to move contact in search folder', async () => {
		// Create a contact
		const createContactRequest =
			`<CreateContactRequest xmlns='urn:zimbraMail'>
				<cn>
					<a n='firstName'>First${common.getUniqueString()}</a>
					<a n='lastName'>Last${common.getUniqueString()}</a>
					<a n='email'>email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`;
		const contactResponse = await soap.makeSOAPEnvelopeAccount(createContactRequest, accountAuthToken);
		const contactId = contactResponse.CreateContactResponse.cn[0].id;

		// Try to move contact to search folder
		const moveRequest =
			`<ContactActionRequest xmlns='urn:zimbraMail'>
				<action id='${contactId}' op='move' l='${searchFolderId1}'/>
			</ContactActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.exists(moveResponse.Fault, 'Verify Fault exists');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Functional | Try to move a tag in search folder', async () => {
		// Create a tag
		const tagName = `Tag${common.getUniqueString()}`;
		const createTagRequest =
			`<CreateTagRequest xmlns='urn:zimbraMail'>
				<tag name='${tagName}' color='1'/>
			</CreateTagRequest>`;
		const tagResponse = await soap.makeSOAPEnvelopeAccount(createTagRequest, accountAuthToken);
		const tagId = tagResponse.CreateTagResponse.tag[0].id;

		// Try to move tag to search folder
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${tagId}' op='move' l='${searchFolderId1}'/>
			</ItemActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.exists(moveResponse.Fault,
			'Verify Fault exists when moving tag to search folder');
	});


	it('Functional | Try to move a mail folder into search folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;
		const createResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Try to move folder to search folder
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='${searchFolderId1}'/>
			</FolderActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.exists(moveResponse.Fault, 'Verify Fault exists');
		assert.include(moveResponse.Fault.Reason.Text, 'cannot put object in that folder',
			'Verify CANNOT_CONTAIN error');
	});


	it('Sanity | Move a search folder within another search folder', async () => {
		// Create two fresh search folders
		const sfName1 = `SearchA${common.getUniqueString()}`;
		const sfReq1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName1}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		const sfId1 = sfResp1.CreateSearchFolderResponse.search[0].id;

		const sfName2 = `SearchB${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:sent' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		const sfId2 = sfResp2.CreateSearchFolderResponse.search[0].id;

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId2}' l='${sfId1}'/>
			</FolderActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
		assert.exists(moveResponse.FolderActionResponse, 'Verify move succeeded');
	});


	it('Sanity | Move default folders into search folder', async () => {
		const defaultFolders = [folderIds.inbox, folderIds.trash, folderIds.sent, folderIds.junk];

		for (const folderId of defaultFolders) {
			const moveRequest =
				`<FolderActionRequest xmlns='urn:zimbraMail'>
					<action op='move' id='${folderId}' l='${searchFolderId1}'/>
				</FolderActionRequest>`;
			const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

			assert.exists(moveResponse.Fault,
				`Verify Fault when moving default folder ${folderId} into search folder`);
			assert.include(moveResponse.Fault.Reason.Text, 'immutable',
				'Verify immutable error');
		}
	});


	it('Sanity | Move search folder to custom folders', async () => {
		const sfName = `SearchMove${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId}' l='${folderIds.junk}'/>
			</FolderActionRequest>`;
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
		assert.exists(moveResponse.FolderActionResponse, 'Verify move succeeded');
	});


	it('Sanity | Rename a search folder', async () => {
		const sfName = `SearchRename${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;

		const newName = `SearchRenamed${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${sfId}' name='${newName}'/>
			</FolderActionRequest>`;
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		assert.notExists(renameResponse.Fault, 'Response should not be a Fault');
		assert.exists(renameResponse.FolderActionResponse, 'Verify rename succeeded');
	});


	it('Sanity | Delete a search folder', async () => {
		const sfName = `SearchDelete${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		assert.notExists(deleteResponse.Fault, 'Response should not be a Fault');
		assert.exists(deleteResponse.FolderActionResponse, 'Verify delete succeeded');
	});


	it('Regression | Delete already deleted search folder', async () => {
		const sfName = `SearchDeleteTwice${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;

		// Delete first time
		const deleteRequest1 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(deleteRequest1, accountAuthToken);

		// Delete again
		const deleteRequest2 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;
		const deleteResponse2 = await soap.makeSOAPEnvelopeAccount(deleteRequest2, accountAuthToken);

		// Should not fail (idempotent)
		assert.notExists(deleteResponse2.Fault, 'Response should not be a Fault');
		assert.exists(deleteResponse2.FolderActionResponse,
			'Verify re-delete does not fail');
	});

});
