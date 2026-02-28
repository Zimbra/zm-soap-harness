import { assert } from 'chai';
import path from 'path';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Reply To Inline Image Mail', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, accountPassword;
	const messageSubject = 'Test message subject1';
	const messageContent = 'Message test content1';
	const replySubject = 'Re: Test message subject1';

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsinline1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsinline2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send an html mail with png inline attachment from zwc to ews client', async () => {
		// Auth account1 and upload inline PNG attachment
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const filePath = path.resolve('data/ews/image2.png');
		const inlineAid = await soap.uploadFile(account1AuthToken, filePath);
		assert.exists(inlineAid, 'Upload should return attachment id');

		const uploadCid1 = `DWT${common.getUniqueString()}`;
		const uploadCid2 = `DWT2${common.getUniqueString()}`;

		// Send HTML mail with inline PNG attachment from account1 to account2
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>${messageContent}</content>
						</mp>
						<mp ct="multipart/related">
							<mp ct="text/html">
							<content>
								&lt;html&gt;
									&lt;head&gt;
										&lt;style type='text/css'&gt;body { font-family: 'Times New Roman'; font-size: 12pt; color: #000000}
										&lt;/style&gt;
									&lt;/head&gt;
									&lt;body&gt;
									&lt;P&gt;Text before image.&lt;/P&gt;
									&lt;P&gt;&lt;IMG src="cid:${uploadCid2}"&gt;&lt;/IMG&gt;
									Text after image.&lt;/P&gt;
									&lt;/body&gt;
								&lt;/html&gt;
							</content>
							</mp>
							<mp ci="${uploadCid1}">
								<attach aid="${inlineAid}" />
							</mp>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// EWS: GetFolder inbox for account2
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

		// EWS: SyncFolderItems to get the mail
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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, "Should find message matching subject");
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;
		const syncState0 = syncMessage.SyncState;

		// EWS: GetItem to verify mail content and inline attachment
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:ExtendedFieldURI PropertyTag="0x7D" PropertyType="String" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Size" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.Message.Body.$.BodyType, 'HTML',
			'Body type should be HTML');
		assert.equal(itemMsg.Items.Message.HasAttachments, 'true',
			'HasAttachments should be true');
		const attachments = itemMsg.Items.Message.Attachments;
		const fileAttach = Array.isArray(attachments.FileAttachment)
			? attachments.FileAttachment[0] : attachments.FileAttachment;
		assert.equal(fileAttach.ContentType, 'image/png',
			'Attachment content type should be image/png');
		assert.equal(fileAttach.Name, 'image2.png',
			'Attachment name should be image2.png');
		assert.equal(fileAttach.IsInline, 'true',
			'Attachment should be inline');

		// EWS: Reply via CreateItem with MimeContent
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const replyMime = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			`Subject: ${replySubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: multipart/alternative;\r\n' +
			'\tboundary="B_3586353514_159392094"\r\n' +
			'\r\n' +
			'> This message is in MIME format. Since your mail reader does not understand\r\n' +
			'this format, some or all of this message may not be legible.\r\n' +
			'\r\n' +
			'--B_3586353514_159392094\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			'Reply message content1\r\n' +
			'\r\n' +
			'\r\n' +
			'--B_3586353514_159392094\r\n' +
			'Content-type: text/html;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: quoted-printable\r\n' +
			'\r\n' +
			'<html><body>Reply message content1</body></html>\r\n' +
			'\r\n' +
			'--B_3586353514_159392094--\r\n' +
			'\r\n'
		).toString('base64');

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${replyMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values>
								<t:Value>:R:3</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account2Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'Reply CreateItem should succeed');

		// EWS: SyncFolderItems with SyncState
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ItemClass" />
						<t:FieldURI FieldURI="item:DateTimeReceived" />
						<t:FieldURI FieldURI="item:HasAttachments" />
						<t:FieldURI FieldURI="item:Categories" />
						<t:FieldURI FieldURI="item:ConversationId" />
						<t:FieldURI FieldURI="item:DateTimeSent" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="item:Importance" />
						<t:FieldURI FieldURI="item:Size" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:DisplayTo" />
						<t:FieldURI FieldURI="item:IsAssociated" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer" />
						<t:ExtendedFieldURI PropertyTag="0x1081" PropertyType="Integer" />
						<t:ExtendedFieldURI PropertyTag="0x1082" PropertyType="SystemTime" />
						<t:ExtendedFieldURI PropertySetId="00020386-0000-0000-C000-000000000046"
							PropertyName="content-class" PropertyType="String" />
						<t:FieldURI FieldURI="message:ConversationIndex" />
						<t:FieldURI FieldURI="message:ConversationTopic" />
						<t:FieldURI FieldURI="message:InternetMessageId" />
						<t:FieldURI FieldURI="message:References" />
						<t:FieldURI FieldURI="item:InReplyTo" />
						<t:ExtendedFieldURI PropertyTag="0xf03" PropertyType="Binary" />
						<t:ExtendedFieldURI PropertySetId="A98A1EF9-FF40-470B-A0D7-4D7DCE6A6462"
							PropertyName="WebExtNotifications" PropertyType="String" />
						<t:ExtendedFieldURI PropertyTag="0x1213" PropertyType="Integer" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState>${syncState0}</SyncState>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Verify on ZWC: account1 received the reply
		await soap.waitFor(5000);
		const account1AuthToken2 = await soap.getAccountAuthToken(account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:"${replySubject}"</query>
			</SearchRequest>`, account1AuthToken2
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, replySubject, 'Subject should match reply subject');
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// GetMsg to verify from/to
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account1AuthToken2
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		const emailAddrs = Array.isArray(msgObj.e) ? msgObj.e : [msgObj.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		const toAddr = emailAddrs.find(e => e.t === 't');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account1Email, 'To should be account1');
	});
});
