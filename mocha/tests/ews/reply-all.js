import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Reply All', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, account4Email, accountPassword;
	const messageSubject = 'Test message subject1';
	const messageContent = 'Message test content1';
	const replySubject = 'Re: Test message subject1';

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsra1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsra2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsra3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account4Email = `ewsra4${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
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
	it('Sanity | Send HTML text mail from user1 To user2,user3 cc user4 from ZWC', async () => {
		// Send HTML mail from account1 to account2, account3 (To) and account4 (Cc) via ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<e t="t" a="${account3Email}" />
					<e t="c" a="${account4Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/html">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		await soap.waitFor(5000);

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
		const rawCreates = syncMessage.Changes?.Create;
		const creates = rawCreates ? (Array.isArray(rawCreates) ? rawCreates : [rawCreates]) : [];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject)
			|| creates.find(c => c?.Message);
		assert.exists(matchedItem, 'Should find message matching subject');
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;
		const syncState0 = syncMessage.SyncState;

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
			'Body should contain content');
		const toRecipients = Array.isArray(itemMsg.Items.Message.ToRecipients.Mailbox)
			? itemMsg.Items.Message.ToRecipients.Mailbox
			: [itemMsg.Items.Message.ToRecipients.Mailbox];
		assert.equal(toRecipients[0].EmailAddress, account2Email,
			'ToRecipient should match account2');

		// EWS: Reply All via CreateItem with MimeContent from account2
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];
		const account4Username = account4Email.split('@')[0];
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
						<t:CcRecipients>
							<t:Mailbox>
								<t:Name>${account3Username}</t:Name>
								<t:EmailAddress>${account3Email}</t:EmailAddress>
							</t:Mailbox>
							<t:Mailbox>
								<t:Name>${account4Username}</t:Name>
								<t:EmailAddress>${account4Email}</t:EmailAddress>
							</t:Mailbox>
						</t:CcRecipients>
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
			'Reply All CreateItem should succeed');

		// EWS: SyncFolderItems with SyncState to verify sync after reply
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

		// Verify on ZWC: account1 received the reply with correct from/to/cc
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

		// GetMsg to verify from/to/cc
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
		const ccAddrs = emailAddrs.filter(e => e.t === 'c');
		assert.isTrue(ccAddrs.some(e => e.a === account3Email),
			'Cc should contain account3');
		assert.isTrue(ccAddrs.some(e => e.a === account4Email),
			'Cc should contain account4');

		// Verify on ZWC again: re-auth and verify same reply on account1
		const account1AuthToken3 = await soap.getAccountAuthToken(account1Email, accountPassword);
		await soap.waitFor(5000);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:"${replySubject}"</query>
			</SearchRequest>`, account1AuthToken3
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		assert.exists(searchRes2.SearchResponse, 'SearchResponse should exist');
		const hit2 = Array.isArray(searchRes2.SearchResponse.c)
			? searchRes2.SearchResponse.c[0] : searchRes2.SearchResponse.c;
		assert.equal(hit2.su, replySubject, 'Subject should match reply subject');
		const msgId2 = Array.isArray(hit2.m) ? hit2.m[0].id : hit2.m.id;

		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId2}" />
			</GetMsgRequest>`, account1AuthToken3
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const msg2 = getMsgRes2.GetMsgResponse.m;
		const msgObj2 = Array.isArray(msg2) ? msg2[0] : msg2;
		const emailAddrs2 = Array.isArray(msgObj2.e) ? msgObj2.e : [msgObj2.e];
		const fromAddr2 = emailAddrs2.find(e => e.t === 'f');
		assert.exists(fromAddr2, 'From address should exist');
		assert.equal(fromAddr2.a, account2Email, 'From should be account2');
		const toAddr2 = emailAddrs2.find(e => e.t === 't');
		assert.exists(toAddr2, 'To address should exist');
		assert.equal(toAddr2.a, account1Email, 'To should be account1');
		const ccAddrs2 = emailAddrs2.filter(e => e.t === 'c');
		assert.isTrue(ccAddrs2.some(e => e.a === account3Email),
			'Cc should contain account3');
		assert.isTrue(ccAddrs2.some(e => e.a === account4Email),
			'Cc should contain account4');
	});
});
