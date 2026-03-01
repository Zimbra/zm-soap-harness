import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Tag Untag', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Password;
	let account2Email, account2Password;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;
		account2Password = config.accountPassword;

		const account1Name = `ewstest1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Email = account1Name;

		const account2Name = `ewstest2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${account2Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Email = account2Name;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Tag a mail item on EWS and sync on ZWC client', async () => {
		// Send mail from account2 to account1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		const messageSubject = `subject${common.getUniqueString()}`;
		const messageContent = 'Message 1 test content';

		await soap.makeSOAPEnvelopeAccount(
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

		// EWS: GetFolder inbox
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
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems
		await common.delay(8000);
		const syncRes = await ews.makeEWSRequest(
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, 'Should find message matching subject');
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify
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
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');

		// EWS: Tag the item via UpdateItem (Categories)
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Categories" />
								<t:Message>
									<t:Categories>
										<t:String>tag1</t:String>
									</t:Categories>
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

		// Re-sync and verify on ZWC
		await ews.makeEWSRequest(
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

		await soap.waitFor(5000);

		// Verify tag on ZWC
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email, account1Password
		);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');

		// GetMsg to check tag name is set
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse?.m : searchRes.SearchResponse.c
				? (Array.isArray(searchRes.SearchResponse.c)
					? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
				: [];
		assert.isAbove(msgs.length, 0, 'Should find the message');
		const msgId = msgs[0].id || msgs[0].m?.[0]?.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
	});


	it('Sanity | Untag a mail item on ZWC and sync on EWS client', async () => {
		// Send mail from account2 to account1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		const messageSubject = `subject${common.getUniqueString()}`;
		const messageContent = 'Message 1 test content';

		await soap.makeSOAPEnvelopeAccount(
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

		await soap.waitFor(5000);

		// EWS: Sync to get the mail item and tag it
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, 'Should find message matching subject');
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// EWS: Tag the item via UpdateItem
		await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Categories" />
								<t:Message>
									<t:Categories>
										<t:String>tag1</t:String>
									</t:Categories>
								</t:Message>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, account1Password
		);

		await soap.waitFor(5000);

		// ZWC: Untag the item
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email, account1Password
		);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		const messages = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse?.m : [searchRes.SearchResponse?.m];
		const msgId = messages[0].id;

		const untagRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="!tag" tn="tag1" />
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(untagRes.Fault, 'MsgActionRequest should not be a Fault');
		assert.equal(untagRes.MsgActionResponse.action.op, '!tag',
			'Action op should be !tag');
		assert.equal(untagRes.MsgActionResponse.action.id, msgId,
			'Action id should match message id');

		// EWS: Verify on EWS that Categories is now empty
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
		const inboxId = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(inboxId) ? inboxId[0] : inboxId;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');

		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		const creates2 = Array.isArray(syncMessage2.Changes.Create)
			? syncMessage2.Changes.Create : [syncMessage2.Changes.Create];
		const matchedItem2 = creates2.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem2, 'Should find message matching subject');
		const latestItemId = matchedItem2.Message.ItemId.$.Id;
		const latestChangeKey = matchedItem2.Message.ItemId.$.ChangeKey;

		// GetItem with Categories to verify untagged
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
					<t:ItemId Id="${latestItemId}" ChangeKey="${latestChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent,
			'Body should contain expected content');
	});
});
