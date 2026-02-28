import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Recover Mail From Dumpster', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account2AuthToken, accountPassword;
	const messageSubject1 = 'Message 1 test subject';
	const messageContent1 = 'Message 1 test content';
	const messageSubject2 = 'Message 2 test subject';
	const messageContent2 = 'Message 2 test content';
	const messageSubject3 = 'Message 3 test subject';
	const messageContent3 = 'Message 3 test content';
	let subFolder1Name, subFolder1Id;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsdump1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsdump2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
				<a n="zimbraDumpsterEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Hard delete email and verify it is not present in Trash in EWS client and verify on server Recover mail from dumpster to inbox from Server and verify in EWS', async () => {
		// Send mail from account1 to account2 via EWS
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const mimeContent = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			'Date: Tue, 8 Aug 2017 04:47:01 -0400 (EDT)\r\n' +
			`Subject: ${messageSubject1}\r\n` +
			'Message-ID: <170593120.259.150218202149.JavaMail@test>\r\n' +
			`Thread-Topic: ${messageSubject1}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcherset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${messageContent1}`
		).toString('base64');

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
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values>
								<t:Value>:R:0</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');

		// SyncFolderItems on sent items for account1
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
			account1Email, accountPassword
		);
		const syncSentBody = ews.getBody(syncSentRes);
		const syncSentMsg = syncSentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSentMessage = Array.isArray(syncSentMsg) ? syncSentMsg[0] : syncSentMsg;
		assert.equal(syncSentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// ZWC: Search for mail on account2
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject1}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject1, 'Subject should match');
		const mailIdWc1 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// GetMsg to verify content
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mailIdWc1}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgObj = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.include(msgObj.su, messageSubject1, 'Subject should contain expected text');
		assert.include(msgObj.fr, messageContent1, 'Content should contain expected text');

		// Hard delete mail from Server for Dumpster enabled user
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${mailIdWc1}" op="delete" />
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		const deleteAction = deleteRes.MsgActionResponse.action;
		assert.equal(deleteAction.op, 'delete', 'Action op should be delete');
		assert.equal(deleteAction.id, mailIdWc1, 'Action id should match');

		// EWS: Verify hard deleted mail is not in inbox
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2',
			'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox',
			'DisplayName should be Inbox');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on inbox - should be empty (mail was hard deleted)
		const syncInboxRes = await ews.makeEWSRequest(
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
			account2Email, accountPassword
		);
		const syncInboxBody = ews.getBody(syncInboxRes);
		const syncInboxMsg = syncInboxBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncInboxMessage = Array.isArray(syncInboxMsg) ? syncInboxMsg[0] : syncInboxMsg;
		assert.equal(syncInboxMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// EWS: Verify hard deleted mail is not in trash
		const getTrashRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="deleteditems">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getTrashBody = ews.getBody(getTrashRes);
		const getTrashMsg = getTrashBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const trashMsg = Array.isArray(getTrashMsg) ? getTrashMsg[0] : getTrashMsg;
		assert.equal(trashMsg.$.ResponseClass, 'Success', 'GetFolder trash should succeed');
		assert.equal(trashMsg.Folders.Folder.FolderId.$.Id, '3',
			'Trash folder Id should be 3');
		assert.equal(trashMsg.Folders.Folder.DisplayName, 'Trash',
			'DisplayName should be Trash');
		const trashId = trashMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on trash - should be empty
		const syncTrashRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${trashId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncTrashBody = ews.getBody(syncTrashRes);
		const syncTrashMsg = syncTrashBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncTrashMessage = Array.isArray(syncTrashMsg) ? syncTrashMsg[0] : syncTrashMsg;
		assert.equal(syncTrashMessage.$.ResponseClass, 'Success',
			'SyncFolderItems trash should succeed');

		// ZWC: Verify mail is in dumpster
		const dumpsterRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>-in:/Junk subject:${messageSubject1}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(dumpsterRes.Fault, 'Response should not be a Fault');
		const dumpsterHit = Array.isArray(dumpsterRes.SearchResponse.m)
			? dumpsterRes.SearchResponse.m[0] : dumpsterRes.SearchResponse.m;
		assert.equal(dumpsterHit.su, messageSubject1, 'Dumpster subject should match');
		const dumpsterMailId = dumpsterHit.id;

		// Recover mail from dumpster to inbox
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${dumpsterMailId}" op="recover" l="${inboxId}" />
			</ItemActionRequest>`, account2AuthToken
		);
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		const recoverAction = recoverRes.ItemActionResponse.action;
		assert.equal(recoverAction.op, 'recover', 'Action op should be recover');
		assert.equal(recoverAction.id, dumpsterMailId, 'Action id should match');

		await soap.waitFor(5000);

		// EWS: Verify mail is recovered in inbox
		const syncRecoverRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncRecoverBody = ews.getBody(syncRecoverRes);
		const syncRecoverMsg = syncRecoverBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncRecoverMessage = Array.isArray(syncRecoverMsg)
			? syncRecoverMsg[0] : syncRecoverMsg;
		assert.equal(syncRecoverMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncRecoverMessage.Changes.Create)
			? syncRecoverMessage.Changes.Create : [syncRecoverMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject1);
		assert.exists(matchedItem, "Should find message matching subject");
		const recoveredMailId = matchedItem.Message.ItemId.$.Id;
		const recoveredChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify recovered mail content
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="message:ToRecipients" />
						<t:FieldURI FieldURI="message:CcRecipients" />
						<t:FieldURI FieldURI="message:BccRecipients" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${recoveredMailId}" ChangeKey="${recoveredChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject1,
			'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent1,
			'Body should contain content');
	});


	it('Sanity | Create a new sub folder from EWS and sync on server Hard delete subfolder email and then Recover deleted mail from dumpster to subfolder', async () => {
		// Create subfolder under inbox via EWS
		subFolder1Name = `sub1_folder${common.getUniqueString()}`;
		const createFolderRes = await ews.makeEWSRequest(
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
			account2Email, accountPassword
		);
		const createFolderBody = ews.getBody(createFolderRes);
		const createFolderMsg = createFolderBody.CreateFolderResponse
			.ResponseMessages.CreateFolderResponseMessage;
		const folderCreateMsg = Array.isArray(createFolderMsg)
			? createFolderMsg[0] : createFolderMsg;
		subFolder1Id = folderCreateMsg.Folders.Folder.FolderId.$.Id;

		// ZWC: Send mail to account2
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject2}</su>
					<mp ct="text/plain">
						<content>${messageContent2}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.waitFor(5000);

		// EWS: GetFolder inbox to verify
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2',
			'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox',
			'DisplayName should be Inbox');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems on inbox to get mail
		const syncRes = await ews.makeEWSRequest(
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
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Move mail to subfolder1 via ZWC
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${sentMsgId}" l="${subFolder1Id}" />
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		const moveAction = moveRes.MsgActionResponse.action;
		assert.equal(moveAction.id, sentMsgId, 'Move action id should match');

		// Verify folder structure on ZWC
		const getFolderZwcRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail" />', account2AuthToken
		);
		assert.notExists(getFolderZwcRes.Fault, 'Response should not be a Fault');

		// Search for mail in subfolder
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox/${subFolder1Name} subject:${messageSubject2}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject2, 'Subject should match');
		const mailIdWc4 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// Hard delete mail
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${mailIdWc4}" op="delete" />
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		const deleteAction = deleteRes.MsgActionResponse.action;
		assert.equal(deleteAction.op, 'delete', 'Action op should be delete');
		assert.equal(deleteAction.id, mailIdWc4, 'Action id should match');

		// Verify mail is in dumpster
		const dumpsterRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>-in:/Junk subject:${messageSubject2}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(dumpsterRes.Fault, 'Response should not be a Fault');
		const dumpsterHit = Array.isArray(dumpsterRes.SearchResponse.m)
			? dumpsterRes.SearchResponse.m[0] : dumpsterRes.SearchResponse.m;
		assert.equal(dumpsterHit.su, messageSubject2, 'Dumpster subject should match');
		const dumpsterMailId = dumpsterHit.id;

		// Recover mail to subfolder1
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${dumpsterMailId}" op="recover" l="${subFolder1Id}" />
			</ItemActionRequest>`, account2AuthToken
		);
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		const recoverAction = recoverRes.ItemActionResponse.action;
		assert.equal(recoverAction.op, 'recover', 'Action op should be recover');
		assert.equal(recoverAction.id, dumpsterMailId, 'Action id should match');

		await soap.waitFor(5000);

		// EWS: Verify mail is recovered in subfolder1
		const syncSubRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${subFolder1Id}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncSubBody = ews.getBody(syncSubRes);
		const syncSubMsg = syncSubBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSubMessage = Array.isArray(syncSubMsg) ? syncSubMsg[0] : syncSubMsg;
		assert.equal(syncSubMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const subCreates = Array.isArray(syncSubMessage.Changes.Create)
			? syncSubMessage.Changes.Create : [syncSubMessage.Changes.Create];
		const matchedSub = subCreates.find(c => c?.Message?.Subject === messageSubject2);
		assert.exists(matchedSub, 'Should find recovered message matching subject');
		const recoveredMailId = matchedSub.Message.ItemId.$.Id;
		const recoveredChangeKey = matchedSub.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify recovered mail content
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${recoveredMailId}" ChangeKey="${recoveredChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject2,
			'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent2,
			'Body should contain content');
	});


	it('Sanity | Create a new sub folder-subfolder2 from EWS and sync on server Hard delete subfolder2 email and then Recover deleted mail from dumpster to different subfolder say subfolder1', async () => {
		// Create subfolder2 under inbox via EWS
		const subFolder2Name = `sub2_folder${common.getUniqueString()}`;
		const createFolderRes = await ews.makeEWSRequest(
			`<CreateFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentFolderId>
					<t:FolderId Id="2" />
				</ParentFolderId>
				<Folders>
					<t:Folder>
						<t:FolderClass>IPF.Note</t:FolderClass>
						<t:DisplayName>${subFolder2Name}</t:DisplayName>
					</t:Folder>
				</Folders>
			</CreateFolder>`,
			account2Email, accountPassword
		);
		const createFolderBody = ews.getBody(createFolderRes);
		const createFolderMsg = createFolderBody.CreateFolderResponse
			.ResponseMessages.CreateFolderResponseMessage;
		const folderCreateMsg = Array.isArray(createFolderMsg)
			? createFolderMsg[0] : createFolderMsg;
		const subFolder2Id = folderCreateMsg.Folders.Folder.FolderId.$.Id;

		// ZWC: Send mail to account2
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject3}</su>
					<mp ct="text/plain">
						<content>${messageContent3}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsgId = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;

		await soap.waitFor(5000);

		// EWS: GetFolder inbox
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2',
			'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox',
			'DisplayName should be Inbox');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems on inbox
		const syncRes = await ews.makeEWSRequest(
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
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Move mail to subfolder2 via ZWC
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${sentMsgId}" l="${subFolder2Id}" />
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		const moveAction = moveRes.MsgActionResponse.action;
		assert.equal(moveAction.id, sentMsgId, 'Move action id should match');

		// Verify folder structure on ZWC
		const getFolderZwcRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail" />', account2AuthToken
		);
		assert.notExists(getFolderZwcRes.Fault, 'Response should not be a Fault');

		// Search for mail in subfolder2
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox/${subFolder2Name} subject:${messageSubject3}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject3, 'Subject should match');
		const mailIdWc5 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// Hard delete mail
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${mailIdWc5}" op="delete" />
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		const deleteAction = deleteRes.MsgActionResponse.action;
		assert.equal(deleteAction.op, 'delete', 'Action op should be delete');
		assert.equal(deleteAction.id, mailIdWc5, 'Action id should match');

		// Verify mail is in dumpster
		const dumpsterRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>-in:/Junk subject:${messageSubject3}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(dumpsterRes.Fault, 'Response should not be a Fault');
		const dumpsterHit = Array.isArray(dumpsterRes.SearchResponse.m)
			? dumpsterRes.SearchResponse.m[0] : dumpsterRes.SearchResponse.m;
		assert.equal(dumpsterHit.su, messageSubject3, 'Dumpster subject should match');
		const dumpsterMailId = dumpsterHit.id;

		// Recover mail to subfolder1 (different from original subfolder2)
		const recoverRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${dumpsterMailId}" op="recover" l="${subFolder1Id}" />
			</ItemActionRequest>`, account2AuthToken
		);
		assert.notExists(recoverRes.Fault, 'Response should not be a Fault');
		const recoverAction = recoverRes.ItemActionResponse.action;
		assert.equal(recoverAction.op, 'recover', 'Action op should be recover');
		assert.equal(recoverAction.id, dumpsterMailId, 'Action id should match');

		await soap.waitFor(5000);

		// EWS: SyncFolderItems on subfolder1 to verify recovered mail
		const syncSubRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${subFolder1Id}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncSubBody = ews.getBody(syncSubRes);
		const syncSubMsg = syncSubBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSubMessage = Array.isArray(syncSubMsg) ? syncSubMsg[0] : syncSubMsg;
		assert.equal(syncSubMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const subCreates = Array.isArray(syncSubMessage.Changes.Create)
			? syncSubMessage.Changes.Create : [syncSubMessage.Changes.Create];
		const lastCreate = subCreates[subCreates.length - 1];
		const recoveredMailId = lastCreate.Message.ItemId.$.Id;
		const recoveredChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify recovered mail content
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${recoveredMailId}" ChangeKey="${recoveredChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject3,
			'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent3,
			'Body should contain content');

		// EWS: Verify mail is NOT present in original subfolder2
		const syncSub2Res = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${subFolder2Id}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncSub2Body = ews.getBody(syncSub2Res);
		const syncSub2Msg = syncSub2Body.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSub2Message = Array.isArray(syncSub2Msg) ? syncSub2Msg[0] : syncSub2Msg;
		assert.equal(syncSub2Message.$.ResponseClass, 'Success',
			'SyncFolderItems subfolder2 should succeed');
	});
});
