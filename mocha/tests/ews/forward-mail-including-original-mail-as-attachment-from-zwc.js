import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Forward Mail Including Original Mail As Attachment From ZWC', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	const messageSubject = 'Message 1 test subject';
	const messageContent = 'Message 1 test content';
	const forwardSubject = 'Fwd: Message 1 test subject';
	const forwardContent = 'Message 1 test content forward original mail as attachment';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsfwdzwc1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsfwdzwc2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsfwdzwc3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
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
	it('Sanity | Send mail from user1 To user2 from EWS and sync on ZWC Then forward same mail to user3 from ZWC and include original mail as attachment', async () => {
		// Send mail from account1 to account2 via EWS CreateItem
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const mimeContent = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			'Date: Tue, 8 Aug 2017 04:47:01 -0400 (EDT)\r\n' +
			`Subject: ${messageSubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${messageContent}`
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
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		// SyncFolderItems sent folder for account1
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
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
		const ssBody = ews.getBody(syncSentRes);
		const ssMsg = ssBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const ssMessage = Array.isArray(ssMsg) ? ssMsg[0] : ssMsg;
		assert.equal(ssMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Receive mail on ZWC for account2
		await soap.waitFor(8000);
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email, accountPassword
		);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject, 'Subject should match');
		const mailIdWc1 = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// GetMsg to verify content
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mailIdWc1}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgObj = getMsgRes.GetMsgResponse.m;
		const msg = Array.isArray(msgObj) ? msgObj[0] : msgObj;
		assert.include(msg.su, messageSubject, 'Subject should contain message subject');
		assert.include(JSON.stringify(msg), messageContent,
			'Message should contain content');

		// Forward mail from account2 to account3 with original as attachment via ZWC
		const fwdRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${mailIdWc1}" rt="w" f="sad">
					<e t="f" a="${account2Email}" />
					<e t="t" a="${account3Email}" />
					<su>${forwardSubject}</su>
					<mp ct="text/plain">
						<content>${forwardContent}</content>
					</mp>
					<attach>
						<m id="${mailIdWc1}" />
					</attach>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(fwdRes.Fault, 'Response should not be a Fault');
		assert.exists(fwdRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Verify on ZWC sent folder that mail has attachment
		const searchSentRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:sent subject:"${forwardSubject}"</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchSentRes.Fault, 'Response should not be a Fault');
		const sentHit = Array.isArray(searchSentRes.SearchResponse.c)
			? searchSentRes.SearchResponse.c[0] : searchSentRes.SearchResponse.c;
		assert.equal(sentHit.su, forwardSubject, 'Subject should match');
		const sentMsgId = Array.isArray(sentHit.m) ? sentHit.m[0].id : sentHit.m.id;

		const getSentRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsgId}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getSentRes.Fault, 'Response should not be a Fault');
		const sentMsg = getSentRes.GetMsgResponse.m;
		const sentMsgObj = Array.isArray(sentMsg) ? sentMsg[0] : sentMsg;
		const emailAddrs = Array.isArray(sentMsgObj.e) ? sentMsgObj.e : [sentMsgObj.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		const toAddr = emailAddrs.find(e => e.t === 't');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account3Email, 'To should be account3');
		const mp = Array.isArray(sentMsgObj.mp) ? sentMsgObj.mp : [sentMsgObj.mp];
		const hasAttachment = mp.some(p => p.cd === 'attachment') ||
			JSON.stringify(mp).includes('"cd":"attachment"');
		assert.isTrue(hasAttachment, 'Mail should have attachment');

		// Verify on EWS: account3 received the forwarded mail with attachment
		await soap.waitFor(8000);

		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account3Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account3Email, accountPassword
		);
		const gfBody = ews.getBody(getFolderRes);
		const gfMsg = gfBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(gfMsg) ? gfMsg[0] : gfMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// SyncFolderItems on inbox
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
			account3Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === forwardSubject || c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, "Should find message matching subject");
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// GetItem to verify attachment
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:HasAttachments" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="message:ToRecipients" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account3Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.Message.Subject, forwardSubject,
			'Subject should match forward subject');
		assert.include(
			JSON.stringify(giMessage.Items.Message.Attachments),
			'message/rfc822', 'Attachment should be message/rfc822 type'
		);
		assert.equal(giMessage.Items.Message.HasAttachments, 'true',
			'HasAttachments should be true');
		const ewsToRecipients = Array.isArray(
			giMessage.Items.Message.ToRecipients.Mailbox
		) ? giMessage.Items.Message.ToRecipients.Mailbox
			: [giMessage.Items.Message.ToRecipients.Mailbox];
		assert.equal(ewsToRecipients[0].EmailAddress, account3Email,
			'ToRecipient should match account3');

		// GetAttachment to verify attachment content
		const attachments = giMessage.Items.Message.Attachments;
		const itemAttachment = Array.isArray(attachments.ItemAttachment)
			? attachments.ItemAttachment[0] : attachments.ItemAttachment;
		const attachmentId = itemAttachment.AttachmentId.$.Id;

		const getAttachRes = await ews.makeEWSRequest(
			`<GetAttachment
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<AttachmentShape>
					<t:IncludeMimeContent>true</t:IncludeMimeContent>
				</AttachmentShape>
				<AttachmentIds>
					<t:AttachmentId Id="${attachmentId}" />
				</AttachmentIds>
			</GetAttachment>`,
			account3Email, accountPassword
		);
		const gaBody = ews.getBody(getAttachRes);
		const gaMsg = gaBody.GetAttachmentResponse
			.ResponseMessages.GetAttachmentResponseMessage;
		const gaMessage = Array.isArray(gaMsg) ? gaMsg[0] : gaMsg;
		assert.equal(gaMessage.$.ResponseClass, 'Success',
			'GetAttachment should succeed');
		const attachedItem = gaMessage.Attachments.ItemAttachment;
		const attached = Array.isArray(attachedItem) ? attachedItem[0] : attachedItem;
		assert.equal(attached.Message.Subject, messageSubject,
			'Attached message subject should match original');
	});
});
