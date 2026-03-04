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
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');

		// Create two search folders for testing
		const searchName1 = `Search${common.getUniqueString()}`;
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName1}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response1 = await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);

		searchFolderId1 = response1.CreateSearchFolderResponse.search[0].id;

		const searchName2 = `Search${common.getUniqueString()}`;
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName2}' query='in:sent' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// GetFolderRequest
		const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken);

		searchFolderId2 = response2.CreateSearchFolderResponse.search[0].id;

		// Get standard folder ids
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getFolderResponse = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = getFolderResponse.GetFolderResponse.folder[0].folder;

		folderIds.inbox = folders.find(f => f.name === 'Inbox').id;
		folderIds.trash = folders.find(f => f.name === 'Trash').id;
		folderIds.sent = folders.find(f => f.name === 'Sent').id;
		folderIds.junk = folders.find(f => f.name === 'Junk').id;
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Try to move mail in search folder', async () => {
		// Get inbox folder id with proper RFC 822 headers
		const uniqueStr = common.getUniqueString();
		const addMsgRequest =
			`<AddMsgRequest xmlns='urn:zimbraMail'>
				<m l='${folderIds.inbox}'>
					<content>From: test@example.com
To: test@example.com
Subject: test msg ${uniqueStr}
Date: Thu, 01 Jan 2026 00:00:00 +0000
Content-Type: text/plain

Test content ${uniqueStr}</content>
				</m>
			</AddMsgRequest>`;

		// AddMsgRequest
		const addMsgResponse = await soap.makeSOAPEnvelopeAccount(addMsgRequest, accountAuthToken);
		assert.notExists(addMsgResponse.Fault, 'AddMsg should not be a Fault');
		const messageId = addMsgResponse.AddMsgResponse.m[0].id;
		assert.exists(messageId, 'Message ID should exist');

		// Try to move message to search folder
		const moveRequest =
			`<MsgActionRequest xmlns='urn:zimbraMail'>
				<action id='${messageId}' op='move' l='${searchFolderId1}'/>
			</MsgActionRequest>`;

		// MsgActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
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

		// CreateContactRequest
		const contactResponse = await soap.makeSOAPEnvelopeAccount(createContactRequest, accountAuthToken);
		assert.notExists(contactResponse.Fault, 'CreateContact should not be a Fault');
		const contactId = contactResponse.CreateContactResponse.cn[0].id;
		assert.exists(contactId, 'Contact ID should exist');

		// Try to move contact to search folder
		const moveRequest =
			`<ContactActionRequest xmlns='urn:zimbraMail'>
				<action id='${contactId}' op='move' l='${searchFolderId1}'/>
			</ContactActionRequest>`;

		// ContactActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
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

		// CreateTagRequest
		const tagResponse = await soap.makeSOAPEnvelopeAccount(createTagRequest, accountAuthToken);
		assert.notExists(tagResponse.Fault, 'CreateTag should not be a Fault');
		const tagId = tagResponse.CreateTagResponse.tag[0].id;
		assert.exists(tagId, 'Tag ID should exist');

		// Try to move tag to search folder
		const moveRequest =
			`<ItemActionRequest xmlns='urn:zimbraMail'>
				<action id='${tagId}' op='move' l='${searchFolderId1}'/>
			</ItemActionRequest>`;

		// ItemActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
	});


	it('Functional | Try to move a mail folder into search folder', async () => {
		const folderName = `folder ${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createFolderRequest, accountAuthToken);
		assert.notExists(createResponse.Fault, 'Create should not be a Fault');
		const folderId = createResponse.CreateFolderResponse.folder[0].id;
		assert.exists(folderId, 'Folder ID should exist');

		// Try to move folder to search folder
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='${searchFolderId1}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

		// Verify response
		assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
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

		// CreateSearchFolderRequest
		const sfResp1 = await soap.makeSOAPEnvelopeAccount(sfReq1, accountAuthToken);
		assert.notExists(sfResp1.Fault, 'Create search A should not be a Fault');
		const sfId1 = sfResp1.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId1, 'Search folder A ID should exist');

		const sfName2 = `SearchB${common.getUniqueString()}`;
		const sfReq2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName2}' query='in:sent' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp2 = await soap.makeSOAPEnvelopeAccount(sfReq2, accountAuthToken);
		assert.notExists(sfResp2.Fault, 'Create search B should not be a Fault');
		const sfId2 = sfResp2.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId2, 'Search folder B ID should exist');

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId2}' l='${sfId1}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.id, sfId2,
			'Verify moved search folder id');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Sanity | Move default folders into search folder', async () => {
		const defaultFolders = [folderIds.inbox, folderIds.trash, folderIds.sent, folderIds.junk];

		for (const folderId of defaultFolders) {
			const moveRequest =
				`<FolderActionRequest xmlns='urn:zimbraMail'>
					<action op='move' id='${folderId}' l='${searchFolderId1}'/>
				</FolderActionRequest>`;

			// FolderActionRequest
			const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

			// Verify response
			assert.exists(moveResponse.Fault.Detail.Error, 'Fault Error should exist');
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

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${sfId}' l='${folderIds.junk}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const moveResponse = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify response
		assert.notExists(moveResponse.Fault, 'Response should not be a Fault');
		assert.equal(moveResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(moveResponse.FolderActionResponse.action.op, 'move',
			'Verify op is move');
	});


	it('Sanity | Rename a search folder', async () => {
		const sfName = `SearchRename${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const newName = `SearchRenamed${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${sfId}' name='${newName}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const renameResponse = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		// Verify response
		assert.notExists(renameResponse.Fault, 'Response should not be a Fault');
		assert.equal(renameResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(renameResponse.FolderActionResponse.action.op, 'rename',
			'Verify op is rename');
	});


	it('Sanity | Delete a search folder', async () => {
		const sfName = `SearchDelete${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		const deleteRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const deleteResponse = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken);

		// Verify response
		assert.notExists(deleteResponse.Fault, 'Response should not be a Fault');
		assert.equal(deleteResponse.FolderActionResponse.action.id, sfId,
			'Verify search folder id');
		assert.equal(deleteResponse.FolderActionResponse.action.op, 'delete',
			'Verify op is delete');
	});


	it('Regression | Delete already deleted search folder', async () => {
		const sfName = `SearchDeleteTwice${common.getUniqueString()}`;
		const sfReq =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${sfName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const sfResp = await soap.makeSOAPEnvelopeAccount(sfReq, accountAuthToken);
		assert.notExists(sfResp.Fault, 'Create search should not be a Fault');
		const sfId = sfResp.CreateSearchFolderResponse.search[0].id;
		assert.exists(sfId, 'Search folder ID should exist');

		// Delete first time
		const deleteRequest1 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		const del1Resp = await soap.makeSOAPEnvelopeAccount(deleteRequest1, accountAuthToken);
		assert.notExists(del1Resp.Fault, 'First delete should not be a Fault');
		assert.equal(del1Resp.FolderActionResponse.action.op, 'delete', 'Verify op is delete');

		// Delete again
		const deleteRequest2 =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='delete' id='${sfId}'/>
			</FolderActionRequest>`;
		const deleteResponse2 = await soap.makeSOAPEnvelopeAccount(deleteRequest2, accountAuthToken);

		// Should not fail (idempotent)
		// Verify response
		assert.notExists(deleteResponse2.Fault, 'Response should not be a Fault');

	});

});
