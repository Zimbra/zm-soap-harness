import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Folder Actions', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountPassword;
	const messageSubject = `subject${Date.now()}`;
	const messageSubject1 = `MoveFromInboxToSub_subject${Date.now()}`;
	const messageSubject2 = 'Message 2 subject to test move mail from server';
	const messageContent = 'Message test content';
	const messageContent1 = 'Message 1 test content';
	const messageContent2 = 'Message 2 content to test move mail from server';
	let folder1Name, folder2Name, folderNameEws, subFolder1Name, subFolder2Name;
	let subFolder2Rename, subFolder2RenameZWC;
	let folderId1, inboxId, sentId, trashId;
	let ewsFolderId, subFolder1Id, subFolder2Id, subFolder2ChangeKey;
	let syncState01, syncState03;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		const unique = common.getUniqueString();
		folder1Name = `root1_folder${unique}`;
		folder2Name = `root2_folder${unique}`;
		folderNameEws = `ews_root_folder${unique}`;
		subFolder1Name = `sub1_folder${unique}`;
		subFolder2Name = `sub2_folder${unique}`;
		subFolder2Rename = `sub3_folder${unique}`;
		subFolder2RenameZWC = `sub4_folder${unique}`;

		accountEmail = `ewsfolderactions${unique}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
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
	it('Sanity | Get Folder request for All folders', async () => {
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="outbox">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="sentitems">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="deleteditems">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="drafts">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="junkemail">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="root">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const body = ews.getBody(getFolderRes);
		const msgs = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const msgArr = Array.isArray(msgs) ? msgs : [msgs];

		// Inbox (index 0)
		assert.equal(msgArr[0].$.ResponseClass, 'Success', 'Inbox GetFolder should succeed');
		assert.equal(msgArr[0].Folders.Folder.FolderId.$.Id, '2', 'Inbox Id should be 2');
		assert.equal(msgArr[0].Folders.Folder.DisplayName, 'Inbox', 'DisplayName should be Inbox');
		inboxId = msgArr[0].Folders.Folder.FolderId.$.Id;

		// Sent (index 2)
		assert.equal(msgArr[2].$.ResponseClass, 'Success', 'Sent GetFolder should succeed');
		assert.equal(msgArr[2].Folders.Folder.FolderId.$.Id, '5', 'Sent Id should be 5');
		assert.equal(msgArr[2].Folders.Folder.DisplayName, 'Sent', 'DisplayName should be Sent');
		sentId = msgArr[2].Folders.Folder.FolderId.$.Id;

		// Trash (index 3)
		assert.equal(msgArr[3].$.ResponseClass, 'Success', 'Trash GetFolder should succeed');
		assert.equal(msgArr[3].Folders.Folder.FolderId.$.Id, '3', 'Trash Id should be 3');
		assert.equal(msgArr[3].Folders.Folder.DisplayName, 'Trash', 'DisplayName should be Trash');
		trashId = msgArr[3].Folders.Folder.FolderId.$.Id;

		// Drafts (index 4)
		assert.equal(msgArr[4].$.ResponseClass, 'Success', 'Drafts GetFolder should succeed');
		assert.equal(msgArr[4].Folders.Folder.FolderId.$.Id, '6', 'Drafts Id should be 6');
		assert.equal(msgArr[4].Folders.Folder.DisplayName, 'Drafts', 'DisplayName should be Drafts');

		// Junk (index 5)
		assert.equal(msgArr[5].$.ResponseClass, 'Success', 'Junk GetFolder should succeed');
		assert.equal(msgArr[5].Folders.Folder.FolderId.$.Id, '4', 'Junk Id should be 4');
		assert.equal(msgArr[5].Folders.Folder.DisplayName, 'Junk', 'DisplayName should be Junk');

		// Root (index 6)
		assert.equal(msgArr[6].$.ResponseClass, 'Success', 'Root GetFolder should succeed');
		assert.equal(msgArr[6].Folders.Folder.FolderId.$.Id, '1', 'Root Id should be 1');
		assert.equal(msgArr[6].Folders.Folder.DisplayName, 'USER_ROOT',
			'DisplayName should be USER_ROOT');
	});


	it('Sanity | Create a user folder on root level from ZWC and perform SynFolder request', async () => {
		// Re-authenticate (matching original XML test pattern)
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);

		// Create root folder from ZWC (disable retry - not idempotent)
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="1" />
			</CreateFolderRequest>`, accountAuthToken, false
		);
		if (createRes.Fault && createRes.Fault.Detail &&
			createRes.Fault.Detail.Error && createRes.Fault.Detail.Error.Code === 'mail.ALREADY_EXISTS') {
			// Folder was created on a previous retry but response failed; look it up
			const gfRes = await soap.makeSOAPEnvelopeAccount(
				`<GetFolderRequest xmlns="urn:zimbraMail">
					<folder l="1" />
				</GetFolderRequest>`, accountAuthToken
			);
			const rootFolder = gfRes.GetFolderResponse.folder;
			const rootChildren = Array.isArray(rootFolder) ? rootFolder[0] : rootFolder;
			const childFolders = Array.isArray(rootChildren.folder)
				? rootChildren.folder : [rootChildren.folder];
			const existingFolder = childFolders.find(f => f.name === folder1Name);
			assert.exists(existingFolder, 'Existing folder should be found');
			folderId1 = existingFolder.id;
		} else {
			assert.notExists(createRes.Fault, 'Response should not be a Fault');
			const folder1 = createRes.CreateFolderResponse.folder;
			folderId1 = Array.isArray(folder1) ? folder1[0].id : folder1.id;
		}

		// SyncFolderHierarchy on EWS
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderHierarchy
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:ParentFolderId" />
						<t:FieldURI FieldURI="folder:DisplayName" />
						<t:FieldURI FieldURI="folder:FolderClass" />
						<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
					</t:AdditionalProperties>
				</FolderShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="msgfolderroot">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</SyncFolderId>
				<SyncState />
			</SyncFolderHierarchy>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderHierarchyResponse
			.ResponseMessages.SyncFolderHierarchyResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const userFolder = creates.find(c => c.Folder && c.Folder.DisplayName === folder1Name);
		assert.exists(userFolder, 'Created folder should appear in sync');
		assert.equal(userFolder.Folder.FolderId.$.Id, folderId1,
			'Folder Id should match');
		assert.equal(userFolder.Folder.ParentFolderId.$.Id, '1',
			'ParentFolderId should be 1');

		// Send mail and move to created folder
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken, false
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = sendRes.SendMsgResponse.m;
		const sentMsgId = Array.isArray(sentMsg) ? sentMsg[0].id : sentMsg.id;

		// GetFolder inbox on EWS
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const gfBody = ews.getBody(getFolderRes);
		const gfMsg = gfBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const gfMessage = Array.isArray(gfMsg) ? gfMsg[0] : gfMsg;
		assert.equal(gfMessage.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(gfMessage.Folders.Folder.FolderId.$.Id, '2', 'Inbox Id should be 2');
		inboxId = gfMessage.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems inbox on EWS
		await common.delay(8000);
		const syncItemsRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const siBody = ews.getBody(syncItemsRes);
		const siMsg = siBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const siMessage = Array.isArray(siMsg) ? siMsg[0] : siMsg;
		assert.equal(siMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const siCreates = Array.isArray(siMessage.Changes.Create)
			? siMessage.Changes.Create : [siMessage.Changes.Create];
		const mailItemId = siCreates[0].Message.ItemId.$.Id;
		const mailChangeKey = siCreates[0].Message.ItemId.$.ChangeKey;
		syncState01 = siMessage.SyncState;

		// Move mail from inbox to folder1
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${sentMsgId}" l="${folderId1}" />
			</MsgActionRequest>`, accountAuthToken, false
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		assert.equal(moveRes.MsgActionResponse.action.id, sentMsgId,
			'Moved message id should match');

		// SyncFolderItems on new folder via EWS
		const syncFolder1Res = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${folderId1}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const sf1Body = ews.getBody(syncFolder1Res);
		const sf1Msg = sf1Body.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const sf1Message = Array.isArray(sf1Msg) ? sf1Msg[0] : sf1Msg;
		assert.equal(sf1Message.$.ResponseClass, 'Success',
			'SyncFolderItems on new folder should succeed');
	});


	it('Sanity | Create a new folder from EWS and sync on server Add an item to this folder from server and sync back to EWS', async () => {
		// Create folder from EWS
		const createRes = await ews.makeEWSRequest(
			`<CreateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentFolderId>
					<t:FolderId Id="1" />
				</ParentFolderId>
				<Folders>
					<t:Folder>
						<t:FolderClass>IPF.Note</t:FolderClass>
						<t:DisplayName>${folderNameEws}</t:DisplayName>
					</t:Folder>
				</Folders>
			</CreateFolder>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateFolderResponse
			.ResponseMessages.CreateFolderResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		ewsFolderId = createMessage.Folders.Folder.FolderId.$.Id;

		// Verify folder on ZWC
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = getFolderRes.GetFolderResponse.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const childFolders = Array.isArray(rootFolder.folder)
			? rootFolder.folder : [rootFolder.folder];
		const ewsFolder = childFolders.find(f => f.name === folderNameEws);
		assert.exists(ewsFolder, 'EWS-created folder should be visible on ZWC');
		const folderIdZwc = ewsFolder.id;

		// Move a mail to this folder
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// Search for the mail
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const mailId = msgs[0].id;

		// Move to EWS folder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${mailId}" l="${folderIdZwc}" />
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// SyncFolderItems on EWS folder
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${ewsFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
	});


	it('Sanity | Create a new sub folder from EWS and sync on server Create a sub folder from ZWC and sync on EWS client', async () => {
		// Create sub folder under inbox on EWS
		const createRes = await ews.makeEWSRequest(
			`<CreateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentFolderId>
					<t:FolderId Id="2" />
				</ParentFolderId>
				<Folders>
					<t:Folder>
						<t:FolderClass>IPF.Note</t:FolderClass>
						<t:DisplayName>${subFolder1Name}</t:DisplayName>
					</t:Folder>
				</Folders>
			</CreateFolder>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateFolderResponse
			.ResponseMessages.CreateFolderResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateFolder should succeed');
		subFolder1Id = createMessage.Folders.Folder.FolderId.$.Id;

		// Verify sub folder on ZWC
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const allFolders = JSON.stringify(getFolderRes.GetFolderResponse);
		assert.include(allFolders, subFolder1Name,
			'Sub folder should be visible on ZWC');

		// Create sub folder from ZWC under the EWS subfolder
		const createSubRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subFolder2Name}" l="${subFolder1Id}" />
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(createSubRes.Fault, 'Response should not be a Fault');
		const folder2 = createSubRes.CreateFolderResponse.folder;
		subFolder2Id = Array.isArray(folder2) ? folder2[0].id : folder2.id;

		// Sync on EWS
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderHierarchy
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:ParentFolderId" />
						<t:FieldURI FieldURI="folder:DisplayName" />
						<t:FieldURI FieldURI="folder:FolderClass" />
						<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
					</t:AdditionalProperties>
				</FolderShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="msgfolderroot">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</SyncFolderId>
				<SyncState />
			</SyncFolderHierarchy>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderHierarchyResponse
			.ResponseMessages.SyncFolderHierarchyResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const sub2Folder = creates.find(c => c.Folder &&
			c.Folder.DisplayName === subFolder2Name);
		assert.exists(sub2Folder, 'Sub folder 2 should appear in sync');
		assert.equal(sub2Folder.Folder.FolderId.$.Id, subFolder2Id,
			'Sub folder 2 Id should match');
		subFolder2ChangeKey = sub2Folder.Folder.FolderId.$.ChangeKey;
	});


	it('Sanity | Move mail item from Inbox to subfolder from EWS and verify on Server Move from subfolder to root folder from Server and verify on EWS', async () => {
		// Send mail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}" />
					<su>${messageSubject1}</su>
					<mp ct="text/plain">
						<content>${messageContent1}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');

		// EWS: GetFolder inbox
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const gfBody = ews.getBody(getFolderRes);
		const gfMsg = gfBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const gfMessage = Array.isArray(gfMsg) ? gfMsg[0] : gfMsg;
		assert.equal(gfMessage.$.ResponseClass, 'Success', 'GetFolder should succeed');

		// SyncFolderItems inbox
		await common.delay(8000);
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				<SyncState>${syncState01}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const siBody = ews.getBody(syncRes);
		const siMsg = siBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const siMessage = Array.isArray(siMsg) ? siMsg[0] : siMsg;
		assert.equal(siMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const siCreateData = siMessage.Changes?.Create;
		const siCreates = Array.isArray(siCreateData)
			? siCreateData : (siCreateData ? [siCreateData] : []);
		assert.isAbove(siCreates.length, 0, 'Should have Create items');
		const lastCreate = siCreates[siCreates.length - 1];
		assert.exists(lastCreate?.Message, 'Last Create should have a Message');
		const mailId2 = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey2 = lastCreate.Message.ItemId.$.ChangeKey;

		// GetItem to verify
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId2}" ChangeKey="${mailChangeKey2}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.Message.Subject, messageSubject1,
			'Subject should match');
		assert.include(giMessage.Items.Message.Body._, messageContent1,
			'Body should contain content');

		// MoveItem from inbox to subfolder via EWS
		const moveRes = await ews.makeEWSRequest(
			`<MoveItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="${subFolder1Id}" />
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${mailId2}" ChangeKey="${mailChangeKey2}" />
				</ItemIds>
			</MoveItem>`,
			accountEmail, accountPassword
		);
		const moveBody = ews.getBody(moveRes);
		const moveMsg = moveBody.MoveItemResponse
			.ResponseMessages.MoveItemResponseMessage;
		const moveMessage = Array.isArray(moveMsg) ? moveMsg[0] : moveMsg;
		assert.equal(moveMessage.$.ResponseClass, 'Success', 'MoveItem should succeed');

		// SyncFolderItems on subfolder via EWS
		const syncSubRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${subFolder1Id}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const ssBody = ews.getBody(syncSubRes);
		const ssMsg = ssBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const ssMessage = Array.isArray(ssMsg) ? ssMsg[0] : ssMsg;
		assert.equal(ssMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on subfolder should succeed');
		syncState03 = ssMessage.SyncState;

		// Verify on ZWC
		const gfZwcRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(gfZwcRes.Fault, 'Response should not be a Fault');

		// Search in subfolder on ZWC
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox/${subFolder1Name} subject:${messageSubject1}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject1, 'Subject should match');
		const mailIdWc1 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// Move mail from subfolder to root folder from server
		const moveZwcRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${mailIdWc1}" l="${folderId1}" />
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(moveZwcRes.Fault, 'Response should not be a Fault');

		// Sync root folder on EWS
		const syncRootRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${folderId1}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const srBody = ews.getBody(syncRootRes);
		const srMsg = srBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const srMessage = Array.isArray(srMsg) ? srMsg[0] : srMsg;
		assert.equal(srMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on root folder should succeed');

		// GetItem to verify
		const srCreates = Array.isArray(srMessage.Changes.Create)
			? srMessage.Changes.Create : [srMessage.Changes.Create];
		const lastSrCreate = srCreates[srCreates.length - 1];
		const newItemId = lastSrCreate.Message.ItemId.$.Id;
		const newChangeKey = lastSrCreate.Message.ItemId.$.ChangeKey;

		const getItemRes2 = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${newItemId}" ChangeKey="${newChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const gi2Body = ews.getBody(getItemRes2);
		const gi2Msg = gi2Body.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const gi2Message = Array.isArray(gi2Msg) ? gi2Msg[0] : gi2Msg;
		assert.equal(gi2Message.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(gi2Message.Items.Message.Subject, messageSubject1,
			'Subject should match');
		assert.include(gi2Message.Items.Message.Body._, messageContent1,
			'Body should contain content');
	});


	it('Sanity | Move mail item from Inbox to subfolder from Server and verify on EWS Move from subfolder to root folder from EWS and verify on Server', async () => {
		// Send mail via EWS CreateItem
		const mimeContent = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			'Date: Tue, 8 Aug 2017 04:47:01 -0400 (EDT)\r\n' +
			`Subject: ${messageSubject2}\r\n` +
			`Thread-Topic: ${messageSubject2}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${messageContent2}`
		).toString('base64');

		const username = accountEmail.split('@')[0];
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mimeContent}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${username}</t:Name>
								<t:EmailAddress>${accountEmail}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${username}</t:Name>
								<t:EmailAddress>${accountEmail}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		// Sync sent folder on EWS
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const ssBody = ews.getBody(syncSentRes);
		const ssMsg = ssBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const ssMessage = Array.isArray(ssMsg) ? ssMsg[0] : ssMsg;
		assert.equal(ssMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Re-auth on ZWC and search for delivery
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		await soap.waitFor(5000);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox subject:${messageSubject2}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject2, 'Subject should match');
		const mailIdWc2 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// Move mail from inbox to subfolder via ZWC
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${mailIdWc2}" l="${subFolder1Id}" />
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// Sync subfolder on EWS
		await common.delay(8000);
		const syncSubRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${subFolder1Id}" />
				</SyncFolderId>
				<SyncState>${syncState03}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const subBody = ews.getBody(syncSubRes);
		const subMsg = subBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const subMessage = Array.isArray(subMsg) ? subMsg[0] : subMsg;
		assert.equal(subMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const subCreates = Array.isArray(subMessage.Changes.Create)
			? subMessage.Changes.Create : [subMessage.Changes.Create];
		const subItemId = subCreates[0].Message.ItemId.$.Id;
		const subChangeKey = subCreates[0].Message.ItemId.$.ChangeKey;

		// GetItem to verify
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${subItemId}" ChangeKey="${subChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.Message.Subject, messageSubject2,
			'Subject should match');
		assert.include(giMessage.Items.Message.Body._, messageContent2,
			'Body should contain content');

		// MoveItem from subfolder to root folder via EWS
		const moveEwsRes = await ews.makeEWSRequest(
			`<MoveItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="${folderId1}" />
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${subItemId}" ChangeKey="${subChangeKey}" />
				</ItemIds>
			</MoveItem>`,
			accountEmail, accountPassword
		);
		const meBody = ews.getBody(moveEwsRes);
		const meMsg = meBody.MoveItemResponse
			.ResponseMessages.MoveItemResponseMessage;
		const meMessage = Array.isArray(meMsg) ? meMsg[0] : meMsg;
		assert.equal(meMessage.$.ResponseClass, 'Success', 'MoveItem should succeed');

		// Sync root folder on EWS
		const syncRootRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${folderId1}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const srBody = ews.getBody(syncRootRes);
		const srMsg = srBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const srMessage = Array.isArray(srMsg) ? srMsg[0] : srMsg;
		assert.equal(srMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Verify on ZWC
		accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:${folder1Name} subject:${messageSubject2}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const hit2 = Array.isArray(searchRes2.SearchResponse.c)
			? searchRes2.SearchResponse.c[0] : searchRes2.SearchResponse.c;
		assert.equal(hit2.su, messageSubject2, 'Subject should match');
	});


	it('Sanity | Rename a folder from EWS and sync on server and vice versa', async () => {
		// Rename sub folder 2 from EWS
		const updateRes = await ews.makeEWSRequest(
			`<UpdateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderChanges>
					<t:FolderChange>
						<t:FolderId Id="${subFolder2Id}"
							ChangeKey="${subFolder2ChangeKey}" />
						<t:Updates>
							<t:SetFolderField>
								<t:FieldURI FieldURI="folder:DisplayName" />
								<t:Folder>
									<t:DisplayName>${subFolder2Rename}</t:DisplayName>
								</t:Folder>
							</t:SetFolderField>
						</t:Updates>
					</t:FolderChange>
				</FolderChanges>
			</UpdateFolder>`,
			accountEmail, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success', 'UpdateFolder should succeed');
		assert.equal(updateMessage.Folders.Folder.FolderId.$.Id, subFolder2Id,
			'Updated folder Id should match');

		// Verify rename on ZWC
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const allFolders = JSON.stringify(getFolderRes.GetFolderResponse);
		assert.include(allFolders, subFolder2Rename,
			'Renamed folder should be visible on ZWC');

		// Rename same folder from ZWC
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${subFolder2Id}" name="${subFolder2RenameZWC}">
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');

		// Sync on EWS
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderHierarchy
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:ParentFolderId" />
						<t:FieldURI FieldURI="folder:DisplayName" />
						<t:FieldURI FieldURI="folder:FolderClass" />
						<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
					</t:AdditionalProperties>
				</FolderShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="msgfolderroot">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</SyncFolderId>
				<SyncState />
			</SyncFolderHierarchy>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderHierarchyResponse
			.ResponseMessages.SyncFolderHierarchyResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const renamedFolder = creates.find(c => c.Folder &&
			c.Folder.DisplayName === subFolder2RenameZWC);
		assert.exists(renamedFolder, 'Renamed folder should appear in sync');
	});


	it('Sanity | Delete a folder from EWS and sync on server and vice versa', async () => {
		// Move folder to trash from EWS (delete)
		const moveFolderRes = await ews.makeEWSRequest(
			`<MoveFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="${trashId}" />
				</ToFolderId>
				<FolderIds>
					<t:FolderId Id="${subFolder2Id}" />
				</FolderIds>
			</MoveFolder>`,
			accountEmail, accountPassword
		);
		const mfBody = ews.getBody(moveFolderRes);
		const mfMsg = mfBody.MoveFolderResponse
			.ResponseMessages.MoveFolderResponseMessage;
		const mfMessage = Array.isArray(mfMsg) ? mfMsg[0] : mfMsg;
		assert.equal(mfMessage.$.ResponseClass, 'Success', 'MoveFolder should succeed');
		assert.equal(mfMessage.Folders.Folder.FolderId.$.Id, subFolder2Id,
			'Moved folder Id should match');

		// Verify on ZWC folder is in trash
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const allFolders = JSON.stringify(getFolderRes.GetFolderResponse);
		assert.include(allFolders, subFolder2RenameZWC,
			'Deleted folder should still exist in trash');

		// Delete sub folder 1 from ZWC
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${subFolder1Id}">
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(trashRes.Fault, 'Response should not be a Fault');

		// Sync on EWS
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderHierarchy
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:ParentFolderId" />
						<t:FieldURI FieldURI="folder:DisplayName" />
						<t:FieldURI FieldURI="folder:FolderClass" />
						<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
					</t:AdditionalProperties>
				</FolderShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="msgfolderroot">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</SyncFolderId>
				<SyncState />
			</SyncFolderHierarchy>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderHierarchyResponse
			.ResponseMessages.SyncFolderHierarchyResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const trashedFolder = creates.find(c => c.Folder &&
			c.Folder.DisplayName === subFolder1Name);
		assert.exists(trashedFolder, 'Trashed folder should appear in sync');
	});


	it('Sanity | Move a folder from EWS and sync on server and vice versa', async () => {
		// Move EWS folder from root to sent via EWS
		const moveFolderRes = await ews.makeEWSRequest(
			`<MoveFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="${sentId}" />
				</ToFolderId>
				<FolderIds>
					<t:FolderId Id="${ewsFolderId}" />
				</FolderIds>
			</MoveFolder>`,
			accountEmail, accountPassword
		);
		const mfBody = ews.getBody(moveFolderRes);
		const mfMsg = mfBody.MoveFolderResponse
			.ResponseMessages.MoveFolderResponseMessage;
		const mfMessage = Array.isArray(mfMsg) ? mfMsg[0] : mfMsg;
		assert.equal(mfMessage.Folders.Folder.FolderId.$.Id, ewsFolderId,
			'Moved folder Id should match');

		// Verify on ZWC
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail" />`, accountAuthToken
		);
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const allFolders = JSON.stringify(getFolderRes.GetFolderResponse);
		assert.include(allFolders, folderNameEws,
			'Moved folder should be visible on ZWC');

		// Move same folder from Sent to Inbox via ZWC
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${ewsFolderId}" l="${inboxId}">
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// Sync on EWS
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderHierarchy
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="folder:ParentFolderId" />
						<t:FieldURI FieldURI="folder:DisplayName" />
						<t:FieldURI FieldURI="folder:FolderClass" />
						<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
					</t:AdditionalProperties>
				</FolderShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="msgfolderroot">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</SyncFolderId>
				<SyncState />
			</SyncFolderHierarchy>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderHierarchyResponse
			.ResponseMessages.SyncFolderHierarchyResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const movedFolder = creates.find(c => c.Folder &&
			c.Folder.DisplayName === folderNameEws);
		assert.exists(movedFolder, 'Moved folder should appear in sync');
		assert.equal(movedFolder.Folder.ParentFolderId.$.Id, inboxId,
			'Parent should be inbox');
		assert.equal(movedFolder.Folder.FolderId.$.Id, ewsFolderId,
			'Folder Id should match');
	});
});
