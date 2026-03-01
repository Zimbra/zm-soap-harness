import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Forward Attachment Mail', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	const messageSubject = 'test forward subject';
	const messageContent = ' test forward content';
	const forwardSubject = 'FW: test forward subject';
	const forwardContent = 'Test forward content1';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsfwdatt1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsfwdatt2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsfwdatt3${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | Send mail with attachment from user1 To user2 from ZWC and sync on EWS Then forward same mail to user3 from EWS', async () => {
		// Send plain text mail from account1 to account2 via ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		await soap.waitFor(8000);

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
		const syncState = syncMessage.SyncState;

		// EWS: GetItem to verify mail content
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
		assert.include(itemMsg.Items.Message.Body._, messageContent,
			'Body should contain the message content');
		const toRecipients = Array.isArray(itemMsg.Items.Message.ToRecipients.Mailbox)
			? itemMsg.Items.Message.ToRecipients.Mailbox
			: [itemMsg.Items.Message.ToRecipients.Mailbox];
		assert.equal(toRecipients[0].EmailAddress, account2Email,
			'ToRecipient should match account2');

		// Forward mail with attachment from account2 to account3 via EWS
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];
		const mimeContent = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			`Subject: ${forwardSubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: multipart/mixed;\r\n' +
			'\tboundary="B_3587392475_1373769279"\r\n' +
			'\r\n' +
			'--B_3587392475_1373769279\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${forwardContent}\r\n` +
			'\r\n' +
			`Subject: ${messageSubject}\r\n` +
			'\r\n' +
			`${messageContent}\r\n` +
			'\r\n' +
			'--B_3587392475_1373769279\r\n' +
			'Content-type: text/plain; name="imapdlog.txt"\r\n' +
			'Content-disposition: attachment;\r\n' +
			'\tfilename="imapdlog.txt"\r\n' +
			'Content-transfer-encoding: base64\r\n' +
			'\r\n' +
			'dGVzdCBhdHRhY2htZW50IGNvbnRlbnQ=\r\n' +
			'\r\n' +
			'--B_3587392475_1373769279--\r\n'
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
								<t:Name>${account3Username}</t:Name>
								<t:EmailAddress>${account3Email}</t:EmailAddress>
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
			'Forward CreateItem should succeed');

		// SyncFolderItems on sent folder to verify
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ItemClass" />
						<t:FieldURI FieldURI="item:HasAttachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const ssentBody = ews.getBody(syncSentRes);
		const ssentMsg = ssentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const ssentMessage = Array.isArray(ssentMsg) ? ssentMsg[0] : ssentMsg;
		assert.equal(ssentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Verify on ZWC: account3 received the forwarded mail
		await soap.waitFor(8000);
		const account3AuthToken = await soap.getAccountAuthToken(
			account3Email, accountPassword
		);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:"${forwardSubject}"</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, forwardSubject, 'Subject should match forwarded subject');
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// GetMsg to verify from/to
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account3AuthToken
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
		assert.equal(toAddr.a, account3Email, 'To should be account3');
	});
});
