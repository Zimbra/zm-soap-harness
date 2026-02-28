import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Email > ZCS1005', function () {
	this.timeout(300 * 1000);
	let account1Email, account1Password, account2Email, account2Password;
	const messageContent = 'Message 1 test content';

	before(async function () {
		await main.before(this.ctx);
		const adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;
		account2Password = config.accountPassword;
		const unique = common.getUniqueString();

		account1Email = `ewszcs1005a${unique}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewszcs1005b${unique}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${account2Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Execute GetItemForMsg in sent item folder of sender and inbox of receiver', async () => {
		// Send a message from account1 to account2 via EWS CreateItem (SendOnly)
		const sendRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendOnly">
				<Items>
					<t:Message>
						<t:Importance>Normal</t:Importance>
						<t:Subject>Sent Test</t:Subject>
						<t:Body BodyType="Text">${messageContent}</t:Body>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="MessageNotJunkFlag"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="Boolean" />
							<t:Value>true</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xe07"
								PropertyType="Integer" />
							<t:Value>1</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090"
								PropertyType="Integer" />
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Email}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Email}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const sendBody = ews.getBody(sendRes);
		const sendMsg = sendBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const sendMessage = Array.isArray(sendMsg) ? sendMsg[0] : sendMsg;
		assert.equal(sendMessage.$.ResponseClass, 'Success', 'CreateItem SendOnly should succeed');

		await soap.waitFor(60000);

		// Save a copy to Sent folder via EWS CreateItem (SaveOnly)
		const saveRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:Importance>Normal</t:Importance>
						<t:Subject>Sent Test</t:Subject>
						<t:Body BodyType="Text">Automated event created to
							verify your identity</t:Body>
						<t:MimeContent CharacterSet=" UTF-8 ">VGhpcyBpcyBhIHRlc3QgbWVzc2FnZQ==</t:MimeContent>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="MessageNotJunkFlag"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="Boolean" />
							<t:Value>true</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xe07"
								PropertyType="Integer" />
							<t:Value>1</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090"
								PropertyType="Integer" />
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Email}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Email}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const saveBody = ews.getBody(saveRes);
		const saveMsg = saveBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const saveMessage = Array.isArray(saveMsg) ? saveMsg[0] : saveMsg;
		assert.equal(saveMessage.$.ResponseClass, 'Success', 'CreateItem SaveOnly should succeed');
		const savedItemId = saveMessage.Items.Message.ItemId.$.Id;

		// GetFolder for sent items folder
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="sentitems">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const gfBody = ews.getBody(getFolderRes);
		const gfMsg = gfBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const gfMessage = Array.isArray(gfMsg) ? gfMsg[0] : gfMsg;
		assert.equal(gfMessage.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const sentFolderId = gfMessage.Folders.Folder.FolderId.$.Id;
		assert.equal(sentFolderId, '5', 'Sent folder Id should be 5');

		// SyncFolderItems for sent folder
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${sentFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const sBody = ews.getBody(syncSentRes);
		const sMsg = sBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const sMessage = Array.isArray(sMsg) ? sMsg[0] : sMsg;
		assert.equal(sMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const sCreates = Array.isArray(sMessage.Changes.Create)
			? sMessage.Changes.Create : [sMessage.Changes.Create];
		const sentItemId = sCreates[0].Message.ItemId.$.Id;

		// GetItem for sent message - verify IsRead is true
		const getItemSentRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${sentItemId}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const giSentBody = ews.getBody(getItemSentRes);
		const giSentMsg = giSentBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giSentMessage = Array.isArray(giSentMsg) ? giSentMsg[0] : giSentMsg;
		assert.equal(giSentMessage.$.ResponseClass, 'Success', 'GetItem for sent should succeed');
		assert.equal(giSentMessage.Items.Message.IsRead, 'true',
			'Sent message should be read');

		await soap.waitFor(20000);

		// GetFolder for inbox of account2
		const getFolderRes2 = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, account2Password
		);
		const gf2Body = ews.getBody(getFolderRes2);
		const gf2Msg = gf2Body.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const gf2Message = Array.isArray(gf2Msg) ? gf2Msg[0] : gf2Msg;
		assert.equal(gf2Message.$.ResponseClass, 'Success', 'GetFolder inbox should succeed');
		const inboxFolderId = gf2Message.Folders.Folder.FolderId.$.Id;
		assert.equal(inboxFolderId, '2', 'Inbox folder Id should be 2');

		// SyncFolderItems for inbox of account2
		const syncInboxRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, account2Password
		);
		const siBody = ews.getBody(syncInboxRes);
		const siMsg = siBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const siMessage = Array.isArray(siMsg) ? siMsg[0] : siMsg;
		assert.equal(siMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const siCreates = Array.isArray(siMessage.Changes.Create)
			? siMessage.Changes.Create : [siMessage.Changes.Create];
		const inboxItemId = siCreates[0].Message.ItemId.$.Id;

		// GetItem for inbox message - verify IsRead is false
		const getItemInboxRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${inboxItemId}" />
				</ItemIds>
			</GetItem>`,
			account2Email, account2Password
		);
		const giInboxBody = ews.getBody(getItemInboxRes);
		const giInboxMsg = giInboxBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giInboxMessage = Array.isArray(giInboxMsg) ? giInboxMsg[0] : giInboxMsg;
		assert.equal(giInboxMessage.$.ResponseClass, 'Success',
			'GetItem for inbox should succeed');
		assert.equal(giInboxMessage.Items.Message.IsRead, 'false',
			'Inbox message should be unread');
	});
});
