import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Sync Mail Properties', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Password, account2Email, account2Password;
	let account1AuthToken, messageId, messageSubject, messageContent;
	let inboxId, mailItemId, mailItemChangeKey;

	before(async function () {
		await main.before(this.ctx);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Password = 'test123';
		account2Password = 'test123';
		account1Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;

		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'CreateAccount1 should not be a Fault');

		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${account2Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'CreateAccount2 should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send a text mail from user 2 to user 1', async () => {
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		messageSubject = `subject${common.getUniqueString()}`;
		messageContent = 'Message 1 test content';

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});


	it('Sanity | Read a mail item on ZWC and sync on EWS client', async () => {
		account1AuthToken = await soap.getAccountAuthToken(account1Email, account1Password);

		await soap.waitFor(5000);

		// Search for the message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		messageId = searchRes.SearchResponse?.m[0].id;

		// Mark as read on ZWC
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="read" />
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(readRes.Fault, 'MsgActionRequest should not be a Fault');
		assert.equal(readRes.MsgActionResponse.action.op, 'read', 'Op should be read');
		assert.equal(readRes.MsgActionResponse.action.id, messageId, 'Id should match');

		// GetFolder on EWS to get inbox id
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const getFolderBody = ews.getBody(getFolderRes);
		assert.exists(getFolderBody.GetFolderResponse, 'GetFolderResponse should exist');
		const getFolderMsg = getFolderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		inboxId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(inboxId, '2', 'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox', 'DisplayName should be Inbox');

		// SyncFolderItems on EWS
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		assert.exists(syncBody.SyncFolderItemsResponse, 'SyncFolderItemsResponse should exist');
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		// GetItem on EWS to verify IsRead is true
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
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		assert.exists(getItemBody.GetItemResponse, 'GetItemResponse should exist');
		const getItemMsg = getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject, 'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent, 'Body should contain content');
		assert.equal(itemMsg.Items.Message.IsRead, 'true', 'IsRead should be true');
	});


	it('Sanity | Unread a mail item on ZWC and sync on EWS client', async () => {
		// Mark as unread on ZWC
		const unreadRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="!read" />
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(unreadRes.Fault, 'MsgActionRequest should not be a Fault');
		assert.equal(unreadRes.MsgActionResponse.action.op, '!read', 'Op should be !read');
		assert.equal(unreadRes.MsgActionResponse.action.id, messageId, 'Id should match');

		// GetFolder on EWS
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2', 'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox', 'DisplayName should be Inbox');
		inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on EWS
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		// GetItem on EWS to verify IsRead is false
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
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject, 'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent, 'Body should contain content');
		assert.equal(itemMsg.Items.Message.IsRead, 'false', 'IsRead should be false');
	});


	it('Sanity | Read a mail item on EWS and sync on ZWC client', async () => {
		// UpdateItem on EWS to set IsRead=true
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsRead" />
								<t:Message>
									<t:IsRead>true</t:IsRead>
								</t:Message>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, account1Password
		);
		const updateBody = ews.getBody(updateRes);
		assert.exists(updateBody.UpdateItemResponse, 'UpdateItemResponse should exist');
		const updateMsg = updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		const updatedItemId = updateMessage.Items.Message.ItemId.$.Id;
		assert.equal(updatedItemId, mailItemId, 'Updated item Id should match');

		// SyncFolderItems on EWS to refresh
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		await soap.waitFor(5000);

		// Verify on ZWC that the message is read
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>is:read</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const matchedMsg = messages.find(c => {
			const msgList = Array.isArray(c.m) ? c.m : [c.m];
			return msgList.some(m => m.id === messageId);
		});
		assert.exists(matchedMsg, 'Message should be found in read conversations');
	});


	it('Sanity | Unread a mail item on EWS and sync on ZWC client', async () => {
		// UpdateItem on EWS to set IsRead=false
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsRead" />
								<t:Message>
									<t:IsRead>false</t:IsRead>
								</t:Message>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, account1Password
		);
		const updateBody = ews.getBody(updateRes);
		assert.exists(updateBody.UpdateItemResponse, 'UpdateItemResponse should exist');
		const updateMsg = updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		const updatedItemId = updateMessage.Items.Message.ItemId.$.Id;
		assert.equal(updatedItemId, mailItemId, 'Updated item Id should match');

		// SyncFolderItems on EWS to refresh
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		await soap.waitFor(5000);

		// Verify on ZWC that the message is unread
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>is:unread</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const matchedMsg = messages.find(c => {
			const msgList = Array.isArray(c.m) ? c.m : [c.m];
			return msgList.some(m => m.id === messageId);
		});
		assert.exists(matchedMsg, 'Message should be found in unread conversations');
	});


	it('Sanity | Flag a mail item on ZWC and sync on EWS client', async () => {
		await soap.waitFor(5000);

		// Search for the message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		messageId = searchRes.SearchResponse?.m[0].id;

		// Flag the message on ZWC
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="flag" />
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(flagRes.Fault, 'MsgActionRequest should not be a Fault');
		assert.equal(flagRes.MsgActionResponse.action.op, 'flag', 'Op should be flag');
		assert.equal(flagRes.MsgActionResponse.action.id, messageId, 'Id should match');

		// GetFolder on EWS
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2', 'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox', 'DisplayName should be Inbox');
		inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on EWS
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		// GetItem on EWS to verify flag status (ExtendedFieldURI 0x1090 = 2 means flagged)
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Categories" />
						<t:FieldURI FieldURI="item:Body" />
						<t:ExtendedFieldURI PropertyTag="0x7D" PropertyType="String" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:ReplyTo" />
						<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject, 'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent, 'Body should contain content');
		const extProps = Array.isArray(itemMsg.Items.Message.ExtendedProperty)
			? itemMsg.Items.Message.ExtendedProperty : [itemMsg.Items.Message.ExtendedProperty];
		const flagProp = extProps.find(
			p => p.ExtendedFieldURI.$.PropertyTag === '0x1090'
		);
		assert.exists(flagProp, 'Flag extended property should exist');
		assert.equal(flagProp.Value, '2', 'Flag value should be 2 (flagged)');
	});


	it('Sanity | Unflag a mail item on EWS and sync on ZWC client', async () => {
		// UpdateItem on EWS to unflag (set 0x1090 to 0)
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer" />
								<t:Item>
									<t:ExtendedProperty>
										<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer" />
										<t:Value>0</t:Value>
									</t:ExtendedProperty>
								</t:Item>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, account1Password
		);
		const updateBody = ews.getBody(updateRes);
		assert.exists(updateBody.UpdateItemResponse, 'UpdateItemResponse should exist');
		const updateMsg = updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		const updatedItemId = updateMessage.Items.Message.ItemId.$.Id;
		assert.equal(updatedItemId, mailItemId, 'Updated item Id should match');

		// SyncFolderItems on EWS to refresh
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		await soap.waitFor(5000);

		// Verify on ZWC that the message is not flagged
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>is:flagged subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = searchRes.SearchResponse?.m;
		assert.notExists(messages, 'No flagged messages should be found');
	});


	it('Sanity | Tag a mail item on ZWC and sync on EWS client', async () => {
		await soap.waitFor(5000);

		// Search for the message in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		messageId = searchRes.SearchResponse?.m[0].id;

		// Create a tag
		const tagName = `tag${common.getUniqueString()}`;
		const tagColor = '5';
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="${tagColor}" />
			</CreateTagRequest>`, account1AuthToken
		);
		assert.notExists(createTagRes.Fault, 'CreateTagRequest should not be a Fault');
		assert.exists(createTagRes.CreateTagResponse, 'CreateTagResponse should exist');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;
		assert.equal(
			createTagRes.CreateTagResponse.tag[0].color, tagColor, 'Tag color should match'
		);

		// Apply tag to message
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="tag" tag="${tagId}" />
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(tagRes.Fault, 'MsgActionRequest should not be a Fault');
		assert.equal(tagRes.MsgActionResponse.action.op, 'tag', 'Op should be tag');
		assert.equal(tagRes.MsgActionResponse.action.id, messageId, 'Id should match');

		// GetFolder on EWS
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2', 'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox', 'DisplayName should be Inbox');
		inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on EWS
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		// GetItem on EWS to verify tag in Categories
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Categories" />
						<t:FieldURI FieldURI="item:Body" />
						<t:ExtendedFieldURI PropertyTag="0x7D" PropertyType="String" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:ReplyTo" />
						<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer" />
						<t:FieldURI FieldURI="item:Categories" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject, 'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent, 'Body should contain content');
		const categories = itemMsg.Items.Message.Categories;
		const categoryStrings = Array.isArray(categories.String)
			? categories.String : [categories.String];
		assert.include(categoryStrings, tagName, 'Categories should include the tag name');
	});


	it('Sanity | Untag a mail item on EWS and sync on ZWC client', async () => {
		// UpdateItem on EWS to remove Categories (untag)
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailItemChangeKey}" />
						<t:Updates>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="item:Categories" />
							</t:DeleteItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, account1Password
		);
		const updateBody = ews.getBody(updateRes);
		assert.exists(updateBody.UpdateItemResponse, 'UpdateItemResponse should exist');
		const updateMsg = updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		const updatedItemId = updateMessage.Items.Message.ItemId.$.Id;
		assert.equal(updatedItemId, mailItemId, 'Updated item Id should match');

		// SyncFolderItems on EWS to refresh
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		mailItemId = creates[0].Message.ItemId.$.Id;
		mailItemChangeKey = creates[0].Message.ItemId.$.ChangeKey;

		await soap.waitFor(5000);

		// Verify on ZWC - search for the message and check it has no tags
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const conversations = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c : [searchRes.SearchResponse.c];
		const matchedConv = conversations.find(c => {
			const msgList = Array.isArray(c.m) ? c.m : [c.m];
			return msgList.some(m => m.id === messageId);
		});
		assert.exists(matchedConv, 'Conversation should be found');

		// GetMsg to verify no tags
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = getMsgRes.GetMsgResponse.m[0];
		assert.notExists(msg.tn, 'Message should have no tag names (tn)');
	});
});
