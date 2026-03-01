import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Reply To Plain Text Mail', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, accountPassword;
	const messageSubject = 'Test message subject';
	const messageContent = 'Message test content';
	const replySubject = 'Re: Test message subject';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsreply1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsreply2${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | Send plain text mail from user1 To user2 from ZWC', async () => {
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
			'Body should contain content');
		const toRecipients = Array.isArray(itemMsg.Items.Message.ToRecipients.Mailbox)
			? itemMsg.Items.Message.ToRecipients.Mailbox
			: [itemMsg.Items.Message.ToRecipients.Mailbox];
		assert.equal(toRecipients[0].EmailAddress, account2Email,
			'ToRecipient should match account2');

		// EWS: Reply via CreateItem with MimeContent
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const replyMime = Buffer.from(
			`User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n` +
			`Subject: ${replySubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			`Mime-version: 1.0\r\n` +
			`Content-type: text/plain; charset="UTF-8"\r\n` +
			`\r\n` +
			`Reply message content\r\n` +
			`\r\n` +
			`${messageContent}\r\n`
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
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
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
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:"${replySubject}"</query>
			</SearchRequest>`, account1AuthToken
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
			</GetMsgRequest>`, account1AuthToken
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
